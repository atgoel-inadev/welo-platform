import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, Project, Assignment } from '@app/common/entities';
import { TaskStatus, AssignmentStatus, WorkflowStage } from '@app/common/enums';
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';

/**
 * State Transition Service
 * Handles workflow state transitions based on project configuration
 * Publishes state.transitioned events for downstream services
 * 
 * This service contains ONLY state transition logic (workflow engine concern)
 * Assignment logic is handled by task-management service
 */
@Injectable()
export class StateTransitionService {
  private readonly logger = new Logger(StateTransitionService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @Inject(MESSAGING_SERVICE)
    private messagingService: IMessagingService,
  ) {}

  /**
   * Process workflow state transition when annotation is submitted
   * Called by annotation.submitted event handler
   */
  async processAnnotationSubmitted(taskId: string): Promise<void> {
    this.logger.log(`\n========== STATE TRANSITION START ==========`);
    this.logger.log(`[Workflow Engine] Processing annotation.submitted for task ${taskId}`);
    
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      this.logger.error(`[FAILED] Task ${taskId} not found`);
      return;
    }

    await this.progressToNextStage(task);
  }

  /**
   * Progress task to next workflow stage based on project configuration
   */
  private async progressToNextStage(task: Task): Promise<void> {
    this.logger.log(`[Step 1] Loading task ${task.id}...`);
    this.logger.log(`[Step 2] Task found. Status: ${task.status}, Project: ${task.project.name}`);
    
    const project = task.project;
    const workflowConfig: any = project.configuration?.workflowConfiguration;

    if (!workflowConfig || !workflowConfig.stages || workflowConfig.stages.length === 0) {
      this.logger.error(`[FAILED] No workflow stages configured for project ${project.id}`);
      return;
    }

    this.logger.log(`[Step 3] Workflow config loaded. Stages: ${workflowConfig.stages.map((s: any) => s.name).join(' → ')}`);

    // Get current stage from task machine state
    const currentStageId = task.machineState?.context?.currentStage;
    this.logger.log(`[Step 4] Machine state currentStage: ${currentStageId}`);
    
    if (!currentStageId) {
      this.logger.error(`[FAILED] Task ${task.id} has no currentStage in machineState`);
      return;
    }

    // Find current stage in workflow configuration
    const currentStageIndex = workflowConfig.stages.findIndex((s: any) => s.id === currentStageId);
    
    if (currentStageIndex === -1) {
      this.logger.error(`[FAILED] Current stage '${currentStageId}' not found in workflow`);
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
      `         Completed: ${completedCount}/${stageAssignments.length}`
    );

    if (completedCount < requiredCount) {
      this.logger.warn(
        `[WAIT] Task ${task.id} NOT ready to progress. Still need ${requiredCount - completedCount} more assignment(s).`
      );
      this.logger.log(`========== STATE TRANSITION END (WAITING) ==========\n`);
      return;
    }

    this.logger.log(`[SUCCESS] All ${requiredCount} assignment(s) completed! Ready to progress to next stage.`);

    // Check if there's a next stage
    if (currentStageIndex >= workflowConfig.stages.length - 1) {
      this.logger.log(`[Step 8] No more stages. Marking task as COMPLETED...`);
      await this.completeTask(task);
      
      // Publish completion event
      await this.publishStateTransitionedEvent(task, currentStage, null, true);
      
      this.logger.log(`========== STATE TRANSITION END (COMPLETED) ==========\n`);
      return;
    }

    // Get next stage
    const nextStage = workflowConfig.stages[currentStageIndex + 1];

    // Update task machine state to next stage
    const previousState = task.machineState;
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
      `[Workflow Advanced] Task ${task.id} transitioned from '${currentStage.name}' to '${nextStage.name}'`
    );

    // Publish state.transitioned event
    await this.publishStateTransitionedEvent(task, currentStage, nextStage, false);

    this.logger.log(`========== STATE TRANSITION END (TRANSITIONED) ==========\n`);
  }

  /**
   * Publish state.transitioned event for downstream services
   * Task-management will consume this to handle auto-assignment
   */
  private async publishStateTransitionedEvent(
    task: Task,
    fromStage: any,
    toStage: any | null,
    isCompleted: boolean,
  ): Promise<void> {
    const event = {
      taskId: task.id,
      projectId: task.projectId,
      batchId: task.batchId,
      fromStage: {
        id: fromStage.id,
        name: fromStage.name,
        type: fromStage.type,
      },
      toStage: toStage ? {
        id: toStage.id,
        name: toStage.name,
        type: toStage.type,
        autoAssign: toStage.auto_assign,
        requiredUsers: toStage.type === 'annotation' 
          ? toStage.annotators_count 
          : toStage.reviewers_count || 1,
        allowedUsers: toStage.allowed_users,
      } : null,
      isCompleted,
      machineState: task.machineState,
      timestamp: new Date().toISOString(),
    };

    await this.messagingService.publishEvent('state.transitioned', event);

    this.logger.log(
      `[Event Published] state.transitioned: ${fromStage.name} → ${toStage?.name || 'COMPLETED'}`
    );
  }

  /**
   * Mark task as completed
   */
  private async completeTask(task: Task): Promise<void> {
    task.status = TaskStatus.APPROVED; // Use APPROVED as final status
    task.machineState = {
      ...task.machineState,
      value: 'completed',
      done: true,
    };
    task.stateUpdatedAt = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`[SUCCESS] Task ${task.id} marked as COMPLETED`);
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
