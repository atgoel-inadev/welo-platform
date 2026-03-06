import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, ProjectTeamMember, Assignment, User } from '@app/common/entities';
import { AssignmentStatus, WorkflowStage, AssignmentMethod, UserStatus } from '@app/common/enums';
import { KafkaService } from '@app/infrastructure';

/**
 * Task Assignment Event Handler
 * Subscribes to state.transitioned events from Workflow Engine
 * Handles auto-assignment when tasks transition to new stages
 * 
 * This separates assignment logic (Task Management concern) 
 * from state transition logic (Workflow Engine concern)
 */
@Injectable()
export class TaskAssignmentEventHandler implements OnModuleInit {
  private readonly logger = new Logger(TaskAssignmentEventHandler.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(ProjectTeamMember)
    private teamMemberRepository: Repository<ProjectTeamMember>,
    private kafkaService: KafkaService,
  ) {}

  async onModuleInit() {
    await this.subscribeToStateTransitioned();
  }

  private async subscribeToStateTransitioned() {
    await this.kafkaService.subscribe('state.transitioned', async (payload) => {
      try {
        const message = JSON.parse(payload.message.value.toString());
        this.logger.log(`\n========== TASK ASSIGNMENT START ==========`);
        this.logger.log(`[Event Received] state.transitioned for task ${message.taskId}`);
        this.logger.log(`[Transition] ${message.fromStage?.name} → ${message.toStage?.name || 'COMPLETED'}`);

        // If task is completed, no assignment needed
        if (message.isCompleted) {
          this.logger.log(`[Task ${message.taskId}] Workflow completed. No assignment needed.`);
          this.logger.log(`========== TASK ASSIGNMENT END (COMPLETED) ==========\n`);
          return;
        }

        const { taskId, projectId, toStage } = message;

        if (!toStage) {
          this.logger.warn(`[Task ${taskId}] No toStage in event. Skipping assignment.`);
          return;
        }

        // Check if auto-assignment is enabled
        if (!toStage.autoAssign) {
          this.logger.log(`[Task ${taskId}] Auto-assign disabled for stage '${toStage.name}'. Skipping.`);
          this.logger.log(`========== TASK ASSIGNMENT END (MANUAL) ==========\n`);
          return;
        }

        // Perform auto-assignment
        await this.autoAssignToStage(taskId, projectId, toStage);

        this.logger.log(`========== TASK ASSIGNMENT END (SUCCESS) ==========\n`);
      } catch (error) {
        this.logger.error(`[Error] Failed to process state.transitioned event: ${error.message}`, error.stack);
      }
    });

    this.logger.log('[Task Assignment] Subscribed to state.transitioned events');
  }

  /**
   * Auto-assign task to users in the specified stage
   */
  private async autoAssignToStage(taskId: string, projectId: string, stage: any): Promise<void> {
    const assignmentCount = stage.requiredUsers || 1;

    this.logger.log(`[Assignment] Task ${taskId} → Stage '${stage.name}' (requires ${assignmentCount} users)`);

    // Get eligible users for this stage
    const eligibleUsers = await this.getEligibleUsersForStage(projectId, stage);

    if (eligibleUsers.length === 0) {
      this.logger.warn(`[Assignment] No eligible users found for stage ${stage.name} in project ${projectId}`);
      return;
    }

    this.logger.log(`[Assignment] Found ${eligibleUsers.length} eligible users for stage '${stage.name}'`);

    // Assign to users (round-robin)
    const usersToAssign = eligibleUsers.slice(0, assignmentCount);

    // Determine assignment order (count existing assignments for this task)
    const existingCount = await this.assignmentRepository.count({
      where: { taskId },
    });

    for (let i = 0; i < usersToAssign.length; i++) {
      const userId = usersToAssign[i];
      try {
        // Create assignment
        const assignment = this.assignmentRepository.create({
          taskId,
          userId,
          workflowStage: this.mapStageTypeToWorkflowStage(stage.type),
          status: AssignmentStatus.ASSIGNED,
          assignedAt: new Date(),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
          assignmentMethod: AssignmentMethod.AUTOMATIC,
          assignmentOrder: existingCount + i + 1,
          isPrimary: i === 0,
          requiresConsensus: false,
          consensusGroupId: taskId,
        });

        await this.assignmentRepository.save(assignment);

        this.logger.log(`[Assignment Created] Task ${taskId} → User ${userId} (stage: ${stage.name})`);

        // Publish assignment event
        await this.kafkaService.publishTaskEvent('assigned', {
          id: taskId,
          userId,
          assignmentId: assignment.id,
          workflowStage: stage.name,
        });

        // Publish notification
        await this.kafkaService.publishNotification({
          userId,
          type: 'TASK_ASSIGNED',
          title: 'New Task Assigned',
          message: `You have been assigned a task in stage '${stage.name}'`,
          metadata: {
            taskId,
            assignmentId: assignment.id,
            stage: stage.name,
          },
        });
      } catch (error) {
        this.logger.error(
          `[Assignment Failed] Task ${taskId} → User ${userId}: ${error.message}`,
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
    if (stage.allowedUsers && stage.allowedUsers.length > 0) {
      this.logger.log(`[Eligibility] Using allowed_users: ${stage.allowedUsers.length} users`);
      return stage.allowedUsers;
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

    this.logger.log(
      `[Eligibility] Found ${eligibleUserIds.length} ${requiredRole}s for stage '${stage.name}' in project ${projectId}`
    );

    return eligibleUserIds;
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
