import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, Assignment, Project, User } from '@app/common/entities';
import { AssignmentStatus, AssignmentMethod, WorkflowStage } from '@app/common/enums';

/**
 * Stage-Based Assignment Service
 * Enforces stage-specific assignment rules for the extended workflow system
 * 
 * Rules:
 * - Stage-based user allocation (allowed_users per stage)
 * - Annotator count enforcement per stage
 * - Reviewer count enforcement per stage
 * - Rework limit checking per stage
 * - Auto-assignment based on stage configuration
 * - Quality gate integration
 */
@Injectable()
export class StageAssignmentService {
  private readonly logger = new Logger(StageAssignmentService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Assigns a task to a user based on current workflow stage
   * Enforces stage-specific rules and user restrictions
   */
  async assignTaskToStage(
    taskId: string,
    userId: string,
    stageId: string,
    assignmentMethod: AssignmentMethod = AssignmentMethod.MANUAL,
  ): Promise<Assignment> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const project = await this.projectRepository.findOne({ where: { id: task.projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${task.projectId} not found`);
    }

    // Get workflow configuration
    const workflowConfig: any = project.configuration?.workflowConfiguration;
    if (!workflowConfig) {
      throw new BadRequestException('Project has no workflow configuration');
    }

    // Get stage configuration
    const stage = workflowConfig.stages?.find((s: any) => s.id === stageId);
    if (!stage) {
      throw new NotFoundException(`Stage ${stageId} not found in workflow configuration`);
    }

    // Validate user is allowed for this stage
    if (stage.allowed_users && stage.allowed_users.length > 0) {
      if (!stage.allowed_users.includes(userId)) {
        throw new BadRequestException(`User ${userId} is not authorized for stage ${stage.name}`);
      }
    }

    // Check rework limits
    const reworkCount = await this.getReworkCount(taskId, stageId);
    if (reworkCount >= (stage.max_rework_attempts || 3)) {
      throw new BadRequestException(
        `Task has exceeded maximum rework attempts (${stage.max_rework_attempts}) for stage ${stage.name}`,
      );
    }

    // Check global rework limit
    const totalRework = await this.getTotalReworkCount(taskId);
    const globalMaxRework = workflowConfig.global_max_rework_before_reassignment || 3;
    if (totalRework >= globalMaxRework) {
      throw new BadRequestException(
        `Task has exceeded global maximum rework attempts (${globalMaxRework})`,
      );
    }

    // Check if already assigned to this user in this stage
    const existing = await this.assignmentRepository.findOne({
      where: {
        taskId,
        userId,
        workflowStage: this.mapStageTypeToWorkflowStage(stage.type),
        status: AssignmentStatus.ASSIGNED,
      },
    });

    if (existing) {
      throw new ConflictException(`Task already assigned to user ${userId} in stage ${stage.name}`);
    }

    // Check capacity based on stage type
    const currentAssignments = await this.getStageAssignmentCount(taskId, stageId, stage.type);
    const maxAssignments = stage.type === 'annotation' 
      ? stage.annotators_count 
      : stage.reviewers_count || 1;

    if (currentAssignments >= maxAssignments) {
      throw new ConflictException(
        `Stage ${stage.name} already has maximum assignments (${maxAssignments})`,
      );
    }

    // Create assignment
    const assignment = this.assignmentRepository.create({
      taskId,
      userId,
      workflowStage: this.mapStageTypeToWorkflowStage(stage.type),
      status: AssignmentStatus.ASSIGNED,
      assignedAt: new Date(),
      expiresAt: new Date(Date.now() + 28800 * 1000), // 8 hours default
      assignmentMethod,
      assignmentOrder: currentAssignments + 1,
      isPrimary: currentAssignments === 0,
      requiresConsensus: stage.require_consensus || false,
      consensusGroupId: taskId,
      metadata: {
        stageId,
        stageName: stage.name,
        stageType: stage.type,
        reworkCount,
      },
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    this.logger.log(
      `Task ${taskId} assigned to user ${userId} in stage ${stage.name} (${stage.type})`,
    );

    return savedAssignment;
  }

  /**
   * Gets the next available task for a user based on stage configuration
   * Supports auto-assignment rules
   */
  async getNextTaskForStage(
    userId: string,
    projectId: string,
    stageId: string,
  ): Promise<Task | null> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const workflowConfig: any = project.configuration?.workflowConfiguration;
    const stage = workflowConfig?.stages?.find((s: any) => s.id === stageId);

    if (!stage) {
      throw new NotFoundException(`Stage ${stageId} not found`);
    }

    // Check if auto-assignment is enabled for this stage
    if (!stage.auto_assign) {
      return null;
    }

    // Check if user is allowed for this stage
    if (stage.allowed_users && stage.allowed_users.length > 0) {
      if (!stage.allowed_users.includes(userId)) {
        return null;
      }
    }

    // Find tasks in this stage that need assignments
    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('task.machineState ->> \'context\' ->> \'currentStage\' = :stageId', { stageId })
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.createdAt', 'ASC')
      .getMany();

    for (const task of tasks) {
      const currentAssignments = await this.getStageAssignmentCount(task.id, stageId, stage.type);
      const maxAssignments = stage.type === 'annotation'
        ? stage.annotators_count
        : stage.reviewers_count || 1;

      if (currentAssignments < maxAssignments) {
        // Check if user already has assignment
        const userAssignment = await this.assignmentRepository.findOne({
          where: {
            taskId: task.id,
            userId,
            status: AssignmentStatus.ASSIGNED,
          },
        });

        if (!userAssignment) {
          return task;
        }
      }
    }

    return null;
  }

  /**
   * Checks if a task has passed quality gates for the current stage
   */
  async checkStageQualityGate(
    taskId: string,
    stageId: string,
    qualityScore: number,
  ): Promise<{ passed: boolean; reason?: string }> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const workflowConfig: any = task.project.configuration?.workflowConfiguration;
    
    // Check if quality gates are enabled
    if (!workflowConfig?.enable_quality_gates) {
      return { passed: true };
    }

    const minimumScore = workflowConfig.minimum_quality_score || 70;
    
    if (qualityScore < minimumScore) {
      return {
        passed: false,
        reason: `Quality score ${qualityScore} is below minimum threshold ${minimumScore}`,
      };
    }

    return { passed: true };
  }

  /**
   * Increments rework count for a task in a specific stage
   */
  async incrementReworkCount(taskId: string, stageId: string): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Update machine state context with rework count
    const context = task.machineState?.context || {};
    const stageRework = context.stageRework || {};
    stageRework[stageId] = (stageRework[stageId] || 0) + 1;

    context.stageRework = stageRework;
    context.reworkCount = (context.reworkCount || 0) + 1;

    task.machineState = {
      ...task.machineState,
      context,
    };

    await this.taskRepository.save(task);

    this.logger.log(`Incremented rework count for task ${taskId} in stage ${stageId}`);
  }

  /**
   * Gets rework count for a specific stage
   */
  private async getReworkCount(taskId: string, stageId: string): Promise<number> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) return 0;

    const stageRework = task.machineState?.context?.stageRework || {};
    return stageRework[stageId] || 0;
  }

  /**
   * Gets total rework count across all stages
   */
  private async getTotalReworkCount(taskId: string): Promise<number> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) return 0;

    return task.machineState?.context?.reworkCount || 0;
  }

  /**
   * Gets current assignment count for a stage
   */
  private async getStageAssignmentCount(
    taskId: string,
    stageId: string,
    stageType: string,
  ): Promise<number> {
    const workflowStage = this.mapStageTypeToWorkflowStage(stageType);
    
    return this.assignmentRepository.count({
      where: {
        taskId,
        workflowStage,
        status: AssignmentStatus.ASSIGNED,
      },
    });
  }

  /**
   * Maps stage type to WorkflowStage enum
   */
  private mapStageTypeToWorkflowStage(stageType: string): WorkflowStage {
    switch (stageType) {
      case 'annotation':
        return WorkflowStage.ANNOTATION;
      case 'review':
        return WorkflowStage.REVIEW;
      case 'qa':
        return WorkflowStage.ANNOTATION; // Map to ANNOTATION as QA doesn't exist in enum
      default:
        return WorkflowStage.ANNOTATION;
    }
  }
}
