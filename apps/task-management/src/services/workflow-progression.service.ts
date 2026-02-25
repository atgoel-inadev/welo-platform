import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, Project, Assignment, ProjectTeamMember, User } from '@app/common/entities';
import { TaskStatus, AssignmentStatus, WorkflowStage, AssignmentMethod, UserStatus } from '@app/common/enums';

/**
 * Workflow Progression Service
 * Handles automatic workflow stage transitions based on project configuration
 * Triggered after task submission to move tasks through the workflow stages
 */
@Injectable()
export class WorkflowProgressionService {
  private readonly logger = new Logger(WorkflowProgressionService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(ProjectTeamMember)
    private teamMemberRepository: Repository<ProjectTeamMember>,
  ) {}

  /**
   * Progress task to next workflow stage after submission
   * Called after annotation/review is submitted
   */
  async progressToNextStage(taskId: string): Promise<void> {
    this.logger.log(`\n========== WORKFLOW PROGRESSION START ==========`);
    this.logger.log(`[Step 1] Loading task ${taskId}...`);
    
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      this.logger.error(`[FAILED] Task ${taskId} not found for workflow progression`);
      return;
    }

    this.logger.log(`[Step 2] Task found. Status: ${task.status}, Project: ${task.project.name}`);
    
    const project = task.project;
    const workflowConfig: any = project.configuration?.workflowConfiguration;

    if (!workflowConfig || !workflowConfig.stages || workflowConfig.stages.length === 0) {
      this.logger.error(`[FAILED] No workflow stages configured for project ${project.id}`);
      this.logger.log(`Project config: ${JSON.stringify(project.configuration, null, 2)}`);
      return;
    }

    this.logger.log(`[Step 3] Workflow config loaded. Stages: ${workflowConfig.stages.map((s: any) => s.name).join(' → ')}`);

    // Get current stage from task machine state
    const currentStageId = task.machineState?.context?.currentStage;
    this.logger.log(`[Step 4] Machine state currentStage: ${currentStageId}`);
    this.logger.log(`         Full machine state: ${JSON.stringify(task.machineState, null, 2)}`);
    
    if (!currentStageId) {
      this.logger.error(`[FAILED] Task ${taskId} has no currentStage in machineState`);
      this.logger.log(`         Need to initialize currentStage to: ${workflowConfig.stages[0].id}`);
      return;
    }

    // Find current stage in workflow configuration
    const currentStageIndex = workflowConfig.stages.findIndex((s: any) => s.id === currentStageId);
    
    if (currentStageIndex === -1) {
      this.logger.error(`[FAILED] Current stage '${currentStageId}' not found in workflow`);
      this.logger.log(`         Available stages: ${workflowConfig.stages.map((s: any) => s.id).join(', ')}`);
      return;
    }

    this.logger.log(`[Step 5] Current stage found: ${workflowConfig.stages[currentStageIndex].name} (index ${currentStageIndex})`);

    const currentStage = workflowConfig.stages[currentStageIndex];

    this.logger.log(`[Step 6] Checking assignments for stage '${currentStage.name}'...`);
    
    // Check if all assignments for current stage are completed
    const stageAssignments = await this.assignmentRepository.find({
      where: {
        taskId: task.id,
        workflowStage: this.mapStageTypeToWorkflowStage(currentStage.type),
      },
    });

    const completedCount = stageAssignments.filter(a => a.status === AssignmentStatus.COMPLETED).length;
    const requiredCount = currentStage.type === 'annotation' 
      ? currentStage.annotators_count 
      : currentStage.reviewers_count || 1;

    this.logger.log(
      `[Step 7] Assignment Status Check:\n` +
      `         Required: ${requiredCount} ${currentStage.type === 'annotation' ? 'annotators' : 'reviewers'}\n` +
      `         Found: ${stageAssignments.length} total assignments\n` +
      `         Completed: ${completedCount}\n` +
      `         Details: ${stageAssignments.map(a => 
        `\n           - ${a.id.substring(0, 8)}: ${a.status} (user: ${a.userId.substring(0, 8)})`
      ).join('')}`
    );

    if (completedCount < requiredCount) {
      this.logger.warn(
        `[WAIT] Task ${taskId} NOT ready to progress. Still need ${requiredCount - completedCount} more assignment(s).`
      );
      this.logger.log(`========== WORKFLOW PROGRESSION END (WAITING) ==========\n`);
      return;
    }

    this.logger.log(
      `[SUCCESS] All ${requiredCount} assignment(s) completed! Ready to progress to next stage.`
    );

    // Check if there's a next stage
    if (currentStageIndex >= workflowConfig.stages.length - 1) {
      this.logger.log(`[Step 8] No more stages. Marking task as COMPLETED...`);
      await this.completeTask(taskId);
      this.logger.log(`[SUCCESS] Task ${taskId} marked as COMPLETED`);
      this.logger.log(`========== WORKFLOW PROGRESSION END (COMPLETED) ==========\n`);
      return;
    }

    // Get next stage
    const nextStage = workflowConfig.stages[currentStageIndex + 1];

    // Update task machine state to next stage
    task.machineState = {
      ...task.machineState,
      value: nextStage.type === 'review' ? 'in_review' : 'assigned',
      context: {
        ...task.machineState?.context,
        currentStage: nextStage.id,
        previousStage: currentStage.id,
        stageTransitionedAt: new Date().toISOString(),
      },
    };

    // Update task status
    if (nextStage.type === 'review') {
      task.status = TaskStatus.SUBMITTED; // Will be assigned to reviewers
    } else {
      task.status = TaskStatus.ASSIGNED;
    }

    task.stateUpdatedAt = new Date();
    await this.taskRepository.save(task);

    this.logger.log(
      `[Workflow Advanced] Task ${taskId} progressed from stage '${currentStage.name}' to '${nextStage.name}' | ` +
      `Auto-assign: ${nextStage.auto_assign ? 'YES' : 'NO'} | ` +
      `Required users: ${nextStage.type === 'annotation' ? nextStage.annotators_count : nextStage.reviewers_count || 1}`
    );

    // Auto-assign to next stage if configured
    if (nextStage.auto_assign) {
      await this.autoAssignToStage(task, nextStage, project.id);
    } else {
      this.logger.log(`[Workflow Info] Task ${taskId} not auto-assigned to stage '${nextStage.name}' (auto_assign=false)`);
    }
  }

  /**
   * Auto-assign task to users in the next stage
   */
  private async autoAssignToStage(task: Task, stage: any, projectId: string): Promise<void> {
    const assignmentCount = stage.type === 'annotation' 
      ? stage.annotators_count 
      : stage.reviewers_count || 1;

    // Get eligible users for this stage
    const eligibleUsers = await this.getEligibleUsersForStage(projectId, stage);

    if (eligibleUsers.length === 0) {
      this.logger.warn(
        `No eligible users found for stage ${stage.name} in project ${projectId}`
      );
      return;
    }

    // Assign to users (round-robin)
    const usersToAssign = eligibleUsers.slice(0, assignmentCount);

    // Determine assignment order (count existing assignments for this task)
    const existingCount = await this.assignmentRepository.count({
      where: { taskId: task.id },
    });

    for (let i = 0; i < usersToAssign.length; i++) {
      const userId = usersToAssign[i];
      try {
        // Create assignment directly (bypassing StageAssignmentService to avoid circular dependency)
        const assignment = this.assignmentRepository.create({
          taskId: task.id,
          userId: userId,
          workflowStage: this.mapStageTypeToWorkflowStage(stage.type),
          status: AssignmentStatus.ASSIGNED,
          assignedAt: new Date(),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
          assignmentMethod: AssignmentMethod.AUTOMATIC,
          assignmentOrder: existingCount + i + 1,
          isPrimary: i === 0,
          requiresConsensus: false,
          consensusGroupId: task.id,
        });

        await this.assignmentRepository.save(assignment);

        this.logger.log(
          `Auto-assigned task ${task.id} to user ${userId} for stage ${stage.name}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to auto-assign task ${task.id} to user ${userId}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Get eligible users for a specific stage
   */
  private async getEligibleUsersForStage(projectId: string, stage: any): Promise<string[]> {
    // If stage has specific allowed users, return those
    if (stage.allowed_users && stage.allowed_users.length > 0) {
      return stage.allowed_users;
    }
const requiredRole = stage.type === 'review' ? 'REVIEWER' : 'ANNOTATOR';

    const teamMembers = await this.teamMemberRepository.find({
      where: {
        projectId,
        role: requiredRole,
        isActive: true,
      },
      relations: ['user'],
    });

    // Filter to only active users
    const eligibleUserIds = teamMembers
      .filter(member => member.user && member.user.status === UserStatus.ACTIVE)
      .map(member => member.userId);

    this.logger.debug(
      `Found ${eligibleUserIds.length} eligible ${requiredRole}s for stage ${stage.name} in project ${projectId}`
    );

    return eligibleUserIds;
  }

  /**
   * Mark task as completed
   */
  private async completeTask(taskId: string): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    
    if (!task) return;

    task.status = TaskStatus.APPROVED; // Use APPROVED as final status
    task.machineState = {
      ...task.machineState,
      value: 'completed',
      done: true,
    };
    task.stateUpdatedAt = new Date();

    await this.taskRepository.save(task);
  }

  /**
   * Map stage type to WorkflowStage enum
   */
  private mapStageTypeToWorkflowStage(stageType: string): WorkflowStage {
    switch (stageType) {
      case 'annotation':
        return WorkflowStage.ANNOTATION;
      case 'review':
        return WorkflowStage.REVIEW;
      case 'qa':
        return WorkflowStage.ANNOTATION;
      default:
        return WorkflowStage.ANNOTATION;
    }
  }
}
