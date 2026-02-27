import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { Task, Assignment, Annotation, Project, Batch, Workflow, User, Queue, AnnotationResponse } from '@app/common/entities';
import { TaskStatus, TaskType, AssignmentStatus, AssignmentMethod, WorkflowStage } from '@app/common/enums';
import { KafkaService } from '../kafka/kafka.service';
import { TaskRenderingService } from '../services/task-rendering.service';
import {
  CreateTaskDto,
  CreateTaskBulkDto,
  UpdateTaskDto,
  AssignTaskDto,
  SubmitTaskDto,
  UpdateTaskStatusDto,
  GetNextTaskDto,
  TaskFilterDto,
  BulkTaskActionDto,
  TaskTransitionDto,
} from '../dto/task.dto';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(Annotation)
    private annotationRepository: Repository<Annotation>,
    @InjectRepository(AnnotationResponse)
    private responseRepository: Repository<AnnotationResponse>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Batch)
    private batchRepository: Repository<Batch>,
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Queue)
    private queueRepository: Repository<Queue>,
    private kafkaService: KafkaService,
    private taskRenderingService: TaskRenderingService,
  ) {
    // Note: WorkflowProgressionService will be lazily imported in submitTask to avoid circular dependency
  }

  async createTask(dto: CreateTaskDto): Promise<Task> {
    // Validate references
    const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    const batch = await this.batchRepository.findOne({ where: { id: dto.batchId } });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${dto.batchId} not found`);
    }

    const workflow = await this.workflowRepository.findOne({ where: { id: dto.workflowId } });
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${dto.workflowId} not found`);
    }

    // Check for duplicate external ID
    const existing = await this.taskRepository.findOne({
      where: { batchId: dto.batchId, externalId: dto.externalId },
    });
    if (existing) {
      throw new ConflictException(`Task with external ID ${dto.externalId} already exists in batch`);
    }

    // Create task
    const task = this.taskRepository.create({
      batchId: dto.batchId,
      projectId: dto.projectId,
      workflowId: dto.workflowId,
      externalId: dto.externalId,
      taskType: TaskType[dto.taskType.toUpperCase()] || TaskType.ANNOTATION,
      status: TaskStatus.QUEUED,
      priority: dto.priority || 5,
      dueDate: dto.dueDate,
      fileType: dto.fileType,
      fileUrl: dto.fileUrl,
      fileMetadata: {
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        ...dto.fileMetadata,
      },
      dataPayload: dto.dataPayload,
      estimatedDuration: dto.estimatedDuration,
      requiresConsensus: dto.requiresConsensus || false,
      totalAssignmentsRequired: dto.totalAssignmentsRequired || project.configuration?.workflowConfiguration?.annotatorsPerTask || 1,
      completedAssignments: 0,
      maxReviewLevel: project.configuration?.workflowConfiguration?.reviewLevels?.length || 0,
      currentReviewLevel: 0,
      machineState: {
        value: 'queued',
        context: {
          taskId: null, // Will be set after save
          projectId: dto.projectId,
          batchId: dto.batchId,
        },
        done: false,
        changed: false,
      },
      attemptCount: 0,
    });

    const savedTask = await this.taskRepository.save(task);

    // Update machine state context with task ID
    savedTask.machineState.context.taskId = savedTask.id;
    await this.taskRepository.save(savedTask);

    // Update batch task count
    batch.totalTasks += 1;
    await this.batchRepository.save(batch);

    // Publish Kafka event
    await this.kafkaService.publishTaskEvent('created', savedTask);

    this.logger.log(`Task created: ${savedTask.id}`);
    return savedTask;
  }

  async createTasksBulk(dto: CreateTaskBulkDto): Promise<{ created: Task[]; errors: any[] }> {
    const created: Task[] = [];
    const errors: any[] = [];

    for (const taskDto of dto.tasks) {
      try {
        const task = await this.createTask(taskDto);
        created.push(task);
      } catch (error) {
        errors.push({
          externalId: taskDto.externalId,
          error: error.message,
        });
      }
    }

    return { created, errors };
  }

  async getTask(taskId: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['batch', 'project', 'workflow', 'assignments', 'annotations'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return task;
  }

  /**
   * Get all assignments for a task with user information
   * Shows completion status for each assignment
   */
  async getTaskAssignments(taskId: string): Promise<any> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const assignments = await this.assignmentRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { assignmentOrder: 'ASC', createdAt: 'ASC' },
    });

    // Transform to include user details and progress information
    const transformedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      workflowStage: assignment.workflowStage,
      status: assignment.status,
      assignmentOrder: assignment.assignmentOrder,
      isPrimary: assignment.isPrimary,
      assignmentMethod: assignment.assignmentMethod,
      assignedAt: assignment.assignedAt,
      acceptedAt: assignment.acceptedAt,
      completedAt: assignment.completedAt,
      expiresAt: assignment.expiresAt,
      user: {
        id: assignment.user?.id,
        email: assignment.user?.email,
        firstName: assignment.user?.firstName,
        lastName: assignment.user?.lastName,
        role: assignment.user?.role,
      },
    }));

    // Get project workflow config to determine requirements
    const project = task.project;
    const workflowStages = (project?.configuration?.workflowConfiguration as any)?.stages || [];
    const currentStageId = task.machineState?.context?.currentStage;
    const currentStage = workflowStages.find((s: any) => s.id === currentStageId) || workflowStages[0];

    // Calculate progress
    const annotationAssignments = assignments.filter(a => a.workflowStage === 'ANNOTATION');
    const reviewAssignments = assignments.filter(a => a.workflowStage === 'REVIEW');
    
    const requiredAnnotators = currentStage?.type === 'annotation' ? currentStage.annotators_count : 0;
    const requiredReviewers = currentStage?.type === 'review' ? currentStage.reviewers_count : 0;

    const completedAnnotators = annotationAssignments.filter(a => a.status === 'COMPLETED').length;
    const completedReviewers = reviewAssignments.filter(a => a.status === 'COMPLETED').length;

    return {
      taskId: task.id,
      taskStatus: task.status,
      currentStage: {
        id: currentStageId,
        name: currentStage?.name,
        type: currentStage?.type,
      },
      progress: {
        annotation: {
          completed: completedAnnotators,
          required: requiredAnnotators,
          total: annotationAssignments.length,
        },
        review: {
          completed: completedReviewers,
          required: requiredReviewers,
          total: reviewAssignments.length,
        },
      },
      assignments: transformedAssignments,
    };
  }

  /**
   * Fetch task WITHOUT relations for update operations.
   * Prevents TypeORM cascade issues that nullify child foreign keys.
   */
  private async getTaskForUpdate(taskId: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      // NO RELATIONS - prevents cascade save from nullifying child FKs
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return task;
  }

  async listTasks(filter: TaskFilterDto): Promise<{ tasks: Task[]; total: number; page: number; pageSize: number }> {
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.batch', 'batch')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignments', 'assignment');

    if (filter.batchId) {
      queryBuilder.andWhere('task.batchId = :batchId', { batchId: filter.batchId });
    }
    if (filter.projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId: filter.projectId });
    }
    if (filter.status) {
      queryBuilder.andWhere('task.status = :status', { status: TaskStatus[filter.status.toUpperCase()] });
    }
    if (filter.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: filter.priority });
    }
    if (filter.taskType) {
      queryBuilder.andWhere('task.taskType = :taskType', { taskType: TaskType[filter.taskType.toUpperCase()] });
    }
    
    // Handle assignedTo filter
    if (filter.assignedTo) {
      queryBuilder
        .andWhere('assignment.userId = :userId', { userId: filter.assignedTo })
        .andWhere('assignment.status IN (:...statuses)', { 
          statuses: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS] 
        });
    }

    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'DESC';
    queryBuilder.orderBy(`task.${sortBy}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    queryBuilder.skip(skip).take(pageSize);

    const [rawTasks, total] = await queryBuilder.getManyAndCount();

    // Transform tasks to add computed fields for frontend
    const tasks = rawTasks.map(task => {
      // Calculate multi-annotator assignment progress
      const allAssignments = task.assignments || [];
      
      // Separate by stage type
      const annotationAssignments = allAssignments.filter(a => 
        a.workflowStage === WorkflowStage.ANNOTATION
      );
      const reviewAssignments = allAssignments.filter(a => 
        a.workflowStage === WorkflowStage.REVIEW
      );

      // Calculate completion counts
      const annotationCompleted = annotationAssignments.filter(
        a => a.status === AssignmentStatus.COMPLETED
      ).length;
      const annotationInProgress = annotationAssignments.filter(
        a => a.status === AssignmentStatus.IN_PROGRESS
      ).length;
      const reviewCompleted = reviewAssignments.filter(
        a => a.status === AssignmentStatus.COMPLETED
      ).length;
      const reviewInProgress = reviewAssignments.filter(
        a => a.status === AssignmentStatus.IN_PROGRESS
      ).length;

      // Find any active assignment for backward compatibility
      const activeAssignment = allAssignments.find(
        a => a.status === AssignmentStatus.ASSIGNED || a.status === AssignmentStatus.IN_PROGRESS
      );

      return {
        ...task,
        // Backward compatibility fields
        assignedTo: activeAssignment?.userId || null,
        workflowStage: activeAssignment?.workflowStage || null,
        fileName: task.fileMetadata?.fileName || task.externalId || 'Unknown',
        
        // Multi-annotator progress metadata
        assignmentProgress: {
          annotation: {
            total: annotationAssignments.length,
            completed: annotationCompleted,
            inProgress: annotationInProgress,
            assigned: annotationAssignments.filter(a => a.status === AssignmentStatus.ASSIGNED).length,
          },
          review: {
            total: reviewAssignments.length,
            completed: reviewCompleted,
            inProgress: reviewInProgress,
            assigned: reviewAssignments.filter(a => a.status === AssignmentStatus.ASSIGNED).length,
          },
        },
      };
    });

    return {
      tasks,
      total,
      page,
      pageSize,
    };
  }

  async updateTask(taskId: string, dto: UpdateTaskDto): Promise<Task> {
    // CRITICAL: Fetch WITHOUT relations to prevent cascade save issues
    const task = await this.getTaskForUpdate(taskId);

    if (dto.status) {
      task.status = TaskStatus[dto.status.toUpperCase()];
    }

    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate) task.dueDate = dto.dueDate;
    if (dto.dataPayload) task.dataPayload = { ...task.dataPayload, ...dto.dataPayload };
    if (dto.estimatedDuration) task.estimatedDuration = dto.estimatedDuration;
    if (dto.actualDuration) task.actualDuration = dto.actualDuration;

    const updatedTask = await this.taskRepository.save(task);

    // Publish Kafka event
    await this.kafkaService.publishTaskEvent('updated', updatedTask);

    this.logger.log(`Task updated: ${taskId}`);
    return updatedTask;
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    await this.taskRepository.softDelete(taskId);

    // Update batch task count
    const batch = await this.batchRepository.findOne({ where: { id: task.batchId } });
    if (batch) {
      batch.totalTasks -= 1;
      await this.batchRepository.save(batch);
    }

    this.logger.log(`Task deleted: ${taskId}`);
  }

  async assignTask(dto: AssignTaskDto): Promise<Assignment> {
    this.logger.log(`Assigning task ${dto.taskId} to user ${dto.userId}`);
    
    if (!dto.taskId) {
      throw new BadRequestException('taskId is required');
    }
    if (!dto.userId) {
      throw new BadRequestException('userId is required');
    }

    const task = await this.getTask(dto.taskId);

    // Check if already assigned to this user
    const existing = await this.assignmentRepository.findOne({
      where: {
        taskId: dto.taskId,
        userId: dto.userId,
        status: In([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]),
      },
    });

    if (existing) {
      throw new ConflictException(`Task already assigned to user ${dto.userId}`);
    }

    // Get assignment count for ordering
    const assignmentCount = await this.assignmentRepository.count({
      where: { taskId: dto.taskId },
    });

    // Create assignment with explicit taskId
    const assignment = this.assignmentRepository.create({
      taskId: dto.taskId,
      userId: dto.userId,
      workflowStage: dto.workflowStage ? WorkflowStage[dto.workflowStage.toUpperCase()] : WorkflowStage.ANNOTATION,
      status: AssignmentStatus.ASSIGNED,
      assignedAt: new Date(),
      expiresAt: new Date(Date.now() + (dto.expiresIn || 28800) * 1000), // Default 8 hours
      assignmentMethod: dto.assignmentMethod ? AssignmentMethod[dto.assignmentMethod.toUpperCase()] : AssignmentMethod.MANUAL,
      assignmentOrder: assignmentCount + 1,
      isPrimary: assignmentCount === 0,
      requiresConsensus: task.requiresConsensus,
      consensusGroupId: task.id,
    });

    this.logger.log(`Creating assignment: taskId=${assignment.taskId}, userId=${assignment.userId}`);
    
    // Use insert instead of save to avoid cascading updates
    const insertResult = await this.assignmentRepository
      .createQueryBuilder()
      .insert()
      .values(assignment)
      .execute();
    
    // Fetch the saved assignment with all fields
    const savedAssignment = await this.assignmentRepository.findOne({
      where: { id: insertResult.identifiers[0].id },
    });
    
    if (!savedAssignment) {
      throw new Error('Failed to create assignment');
    }

    // Update task status and assignment - fetch task without relations to avoid cascading updates
    const taskToUpdate = await this.taskRepository.findOne({ where: { id: dto.taskId } });
    if (!taskToUpdate) {
      throw new NotFoundException(`Task ${dto.taskId} not found`);
    }
    
    taskToUpdate.status = TaskStatus.ASSIGNED;
    taskToUpdate.assignmentId = savedAssignment.id;
    taskToUpdate.assignedAt = new Date();
    await this.taskRepository.save(taskToUpdate);

    // Publish Kafka events
    await this.kafkaService.publishTaskEvent('assigned', task);
    await this.kafkaService.publishNotification({
      userId: dto.userId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You have been assigned task: ${task.externalId}`,
      metadata: {
        taskId: task.id,
        batchId: task.batchId,
        projectId: task.projectId,
      },
    });

    this.logger.log(`Task ${dto.taskId} assigned to user ${dto.userId}`);
    return savedAssignment;
  }

  async getNextTask(dto: GetNextTaskDto): Promise<Task | null> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.batch', 'batch')
      .where('task.status = :status', { status: TaskStatus.QUEUED })
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.createdAt', 'ASC'); // FIFO

    if (dto.projectId) {
      query.andWhere('task.projectId = :projectId', { projectId: dto.projectId });
    }

    if (dto.taskType) {
      query.andWhere('task.taskType = :taskType', { taskType: dto.taskType });
    }

    if (dto.queueId) {
      // Filter by queue configuration if provided
      const queue = await this.queueRepository.findOne({ where: { id: dto.queueId } });
      if (queue) {
        // Apply queue filters if configuration exists
        const queueConfig = queue as any;
        if (queueConfig.configuration?.filters?.priority) {
          query.andWhere('task.priority >= :minPriority', {
            minPriority: queueConfig.configuration.filters.priority,
          });
        }
      }
    }

    const task = await query.getOne();

    if (!task) {
      this.logger.debug(`No available tasks for user ${dto.userId}`);
      return null;
    }

    // Auto-assign to user
    await this.assignTask({
      taskId: task.id,
      userId: dto.userId,
      assignmentMethod: 'CLAIMED',
    });

    return this.getTask(task.id);
  }

  async submitTask(dto: SubmitTaskDto): Promise<Task> {
    // CRITICAL: Fetch WITHOUT relations to prevent cascade save from nullifying assignment.task_id
    const task = await this.getTaskForUpdate(dto.taskId);
    const assignment = await this.assignmentRepository.findOne({
      where: { id: dto.assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${dto.assignmentId} not found`);
    }

    if (assignment.userId !== assignment.userId) {
      throw new BadRequestException('Assignment does not belong to the submitting user');
    }

    // Create annotation
    const annotation = this.annotationRepository.create({
      taskId: dto.taskId,
      assignmentId: dto.assignmentId,
      userId: assignment.userId,
      annotationData: dto.annotationData,
      confidenceScore: dto.confidenceScore,
      timeSpent: dto.timeSpent,
      version: 1,
    });

    const savedAnnotation = await this.annotationRepository.save(annotation);

    // Save annotation responses
    if (dto.responses && dto.responses.length > 0) {
      const responses = dto.responses.map((resp) =>
        this.responseRepository.create({
          taskId: dto.taskId,
          annotationId: savedAnnotation.id,
          assignmentId: dto.assignmentId,
          questionId: resp.questionId,
          response: resp.response,
          timeSpent: resp.timeSpent,
          confidenceScore: resp.confidenceScore,
        }),
      );
      await this.responseRepository.save(responses);
    }

    // Update assignment
    assignment.status = AssignmentStatus.COMPLETED;
    assignment.completedAt = new Date();
    await this.assignmentRepository.save(assignment);

    // Update task
    task.status = TaskStatus.SUBMITTED;
    task.submittedAt = new Date();
    task.completedAssignments += 1;
    task.actualDuration = dto.timeSpent || task.actualDuration;

    // Check if all required assignments are complete
    if (task.completedAssignments >= task.totalAssignmentsRequired) {
      // Check consensus if required
      if (task.requiresConsensus) {
        const consensusScore = await this.calculateConsensus(dto.taskId);
        task.consensusScore = consensusScore;
        task.consensusReached = consensusScore >= 80; // 80% threshold
      } else {
        task.consensusReached = true;
      }
    }

    const updatedTask = await this.taskRepository.save(task);

    this.logger.log(
      `[Task Submitted] TaskId: ${dto.taskId} | AssignmentId: ${dto.assignmentId} | ` +
      `Status: ${updatedTask.status} | Completed: ${updatedTask.completedAssignments}/${updatedTask.totalAssignmentsRequired} | ` +
      `Consensus: ${updatedTask.requiresConsensus ? `required (${updatedTask.consensusScore}%)` : 'not required'}`
    );

    // Publish Kafka events
    await this.kafkaService.publishTaskEvent('submitted', updatedTask);
    await this.kafkaService.publishAnnotationEvent(savedAnnotation);

    // Request quality check
    await this.kafkaService.publishQualityCheckRequest(updatedTask);

    // CRITICAL: Progress workflow to next stage after submission
    // Trigger async workflow progression (don't block task submission)
    this.logger.log(`[Workflow Trigger] Starting workflow progression for task ${dto.taskId}`);
    this.progressWorkflowAfterSubmission(dto.taskId).catch(error => {
      this.logger.error(`[Workflow Error] Workflow progression failed for task ${dto.taskId}: ${error.message}`, error.stack);
    });

    this.logger.log(`Task ${dto.taskId} submitted by assignment ${dto.assignmentId}`);
    return updatedTask;
  }

  /**
   * Progress workflow to next stage after task submission
   * Runs asynchronously to avoid blocking task submission
   */
  private async progressWorkflowAfterSubmission(taskId: string): Promise<void> {
    try {
      const { WorkflowProgressionService } = await import('../services/workflow-progression.service');
      
      const progressionService = new WorkflowProgressionService(
        this.taskRepository,
        this.projectRepository,
        this.assignmentRepository,
        this.taskRepository.manager.connection.getRepository('ProjectTeamMember'),
      );
      
      await progressionService.progressToNextStage(taskId);
      this.logger.log(`Task ${taskId} workflow progression completed`);
    } catch (error) {
      this.logger.error(`Failed to progress workflow for task ${taskId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateTaskStatus(taskId: string, dto: UpdateTaskStatusDto): Promise<Task> {
    // CRITICAL: Fetch WITHOUT relations to prevent cascade save issues
    const task = await this.getTaskForUpdate(taskId);

    const oldStatus = task.status;
    task.status = TaskStatus[dto.status.toUpperCase()];

    // Update machine state
    task.previousState = { ...task.machineState };
    task.machineState = {
      ...task.machineState,
      value: dto.status.toLowerCase(),
      changed: true,
    };
    task.stateUpdatedAt = new Date();

    // Handle status-specific logic
    if (task.status === TaskStatus.APPROVED) {
      task.allReviewsApproved = true;

      // Update batch completed count
      const batch = await this.batchRepository.findOne({ where: { id: task.batchId } });
      if (batch) {
        batch.completedTasks += 1;
        await this.batchRepository.save(batch);
      }
    }

    if (task.status === TaskStatus.SKIPPED && dto.metadata) {
      task.dataPayload = {
        ...task.dataPayload,
        context: {
          ...task.dataPayload.context,
          skipReason: dto.reason,
          skipMetadata: dto.metadata,
        },
      };
    }

    const updatedTask = await this.taskRepository.save(task);

    // Publish Kafka event
    await this.kafkaService.publishTaskEvent('state_changed', {
      ...updatedTask,
      oldStatus,
      newStatus: task.status,
      reason: dto.reason,
    });

    this.logger.log(`Task ${taskId} status changed from ${oldStatus} to ${task.status}`);
    return updatedTask;
  }

  async sendEvent(taskId: string, dto: TaskTransitionDto): Promise<Task> {
    // CRITICAL: Fetch WITHOUT relations to prevent cascade save issues
    const task = await this.getTaskForUpdate(taskId);

    // Update machine state with event
    task.previousState = { ...task.machineState };
    task.machineState = {
      ...task.machineState,
      context: {
        ...task.machineState.context,
        lastEvent: dto.event,
        lastEventPayload: dto.payload,
      },
      changed: true,
    };
    task.stateUpdatedAt = new Date();

    const updatedTask = await this.taskRepository.save(task);

    // Publish to workflow engine
    await this.kafkaService.publishTaskEvent('state_changed', {
      ...updatedTask,
      event: dto.event,
      payload: dto.payload,
    });

    this.logger.log(`Event ${dto.event} sent to task ${taskId}`);
    return updatedTask;
  }

  async bulkAction(dto: BulkTaskActionDto): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const taskId of dto.taskIds) {
      try {
        switch (dto.action) {
          case 'ASSIGN':
            if (!dto.userId) throw new BadRequestException('userId required for ASSIGN action');
            await this.assignTask({ taskId, userId: dto.userId });
            break;

          case 'SKIP':
            await this.updateTaskStatus(taskId, { status: 'SKIPPED', reason: dto.reason });
            break;

          case 'RESET':
            await this.updateTaskStatus(taskId, { status: 'QUEUED', reason: dto.reason });
            break;

          case 'ARCHIVE':
            await this.deleteTask(taskId);
            break;

          case 'HOLD':
            // Create a HOLD status or use existing status
            await this.updateTaskStatus(taskId, { status: 'QUEUED', reason: 'HOLD: ' + dto.reason });
            break;

          case 'PRIORITY_CHANGE':
            if (dto.priority === undefined) throw new BadRequestException('priority required for PRIORITY_CHANGE');
            await this.updateTask(taskId, { priority: dto.priority });
            break;
        }
        success.push(taskId);
      } catch (error) {
        this.logger.error(`Bulk action failed for task ${taskId}`, error);
        failed.push(taskId);
      }
    }

    return { success, failed };
  }

  async getTaskStatistics(taskId: string): Promise<any> {
    const task = await this.getTask(taskId);

    const annotations = await this.annotationRepository.find({
      where: { taskId },
    });

    const responses = await this.responseRepository.find({
      where: { taskId },
    });

    const reviewApprovals = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.reviewApprovals', 'review')
      .where('task.id = :taskId', { taskId })
      .getOne();

    const avgConfidence = annotations.length > 0
      ? annotations.reduce((sum, a) => sum + (a.confidenceScore || 0), 0) / annotations.length
      : 0;

    const avgTimeSpent = annotations.length > 0
      ? annotations.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / annotations.length
      : 0;

    const reviewsApproved = reviewApprovals?.reviewApprovals?.filter((r) => r.status === 'APPROVED').length || 0;
    const reviewsRejected = reviewApprovals?.reviewApprovals?.filter((r) => r.status === 'REJECTED').length || 0;

    return {
      taskId: task.id,
      totalAnnotations: annotations.length,
      completedAnnotations: task.completedAssignments,
      averageConfidenceScore: avgConfidence,
      averageTimeSpent: avgTimeSpent,
      consensusScore: task.consensusScore,
      consensusReached: task.consensusReached,
      currentReviewLevel: task.currentReviewLevel,
      reviewsApproved,
      reviewsRejected,
      responses: responses.length,
    };
  }

  private async calculateConsensus(taskId: string): Promise<number> {
    const annotations = await this.annotationRepository.find({
      where: { taskId },
      relations: ['responses'],
    });

    if (annotations.length < 2) {
      return 100; // Single annotation, full consensus
    }

    // Get all annotation responses for comparison
    const responses = await this.responseRepository.find({
      where: { taskId },
      order: { questionId: 'ASC' },
    });

    // Group responses by question
    const responsesByQuestion = responses.reduce((acc, response) => {
      if (!acc[response.questionId]) {
        acc[response.questionId] = [];
      }
      acc[response.questionId].push(response);
      return acc;
    }, {} as Record<string, typeof responses>);

    // Calculate agreement per question
    const questionScores: number[] = [];
    
    for (const [questionId, questionResponses] of Object.entries(responsesByQuestion)) {
      if (questionResponses.length < 2) {
        questionScores.push(100);
        continue;
      }

      // Count matching responses
      const responseValues = questionResponses.map(r => JSON.stringify(r.response));
      const uniqueResponses = new Set(responseValues);
      
      // If all responses are identical, perfect consensus
      if (uniqueResponses.size === 1) {
        questionScores.push(100);
      } else {
        // Calculate percentage of majority response
        const valueCounts = responseValues.reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const maxCount = Math.max(...Object.values(valueCounts));
        const consensusPercentage = (maxCount / responseValues.length) * 100;
        questionScores.push(consensusPercentage);
      }
    }

    // Return average consensus across all questions
    const avgConsensus = questionScores.reduce((sum, score) => sum + score, 0) / questionScores.length;
    
    this.logger.debug(`Consensus calculated for task ${taskId}: ${avgConsensus.toFixed(2)}%`);
    return Math.round(avgConsensus * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get task render configuration
   * Delegates to TaskRenderingService
   */
  async getTaskRenderConfig(taskId: string, userId: string): Promise<any> {
    return this.taskRenderingService.getTaskRenderConfig(taskId, userId);
  }

  /**
   * Save annotation response
   * Delegates to TaskRenderingService
   */
  async saveAnnotation(taskId: string, userId: string, dto: any): Promise<void> {
    const result = await this.taskRenderingService.saveAnnotationResponse(
      taskId,
      userId,
      dto.responses,
      dto.extraWidgetData,
      dto.timeSpent,
    );

    // CRITICAL: Progress workflow to next stage after annotation submission
    this.logger.log(`[Workflow Trigger] Starting workflow progression for task ${taskId}`);
    this.progressWorkflowAfterSubmission(taskId).catch(error => {
      this.logger.error(`[Workflow Error] Workflow progression failed for task ${taskId}: ${error.message}`, error.stack);
    });

    return result;
  }

  /**
   * Save review decision
   * Delegates to TaskRenderingService
   */
  async saveReview(taskId: string, userId: string, dto: any): Promise<void> {
    return this.taskRenderingService.saveReviewDecision(
      taskId,
      userId,
      dto.decision,
      dto.comments,
      dto.qualityScore,
      dto.extraWidgetData,
      dto.timeSpent,
    );
  }

  /**
   * Get annotation history
   * Delegates to TaskRenderingService
   */
  async getAnnotationHistory(taskId: string): Promise<any> {
    return this.taskRenderingService.getTaskAnnotationHistory(taskId);
  }

  /**
   * Get time analytics — aggregates annotation and review time by user/project/batch.
   * Returns annotator metrics (timeSpent per userId) and reviewer metrics (timeSpent from
   * task.dataPayload.context.lastReview) with optional filters.
   */
  async getTimeAnalytics(query: {
    projectId?: string;
    batchId?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
  }): Promise<any> {
    // ── Build filter conditions ──────────────────────────────────────────────
    const annotationWhere: any = {};
    const taskWhere: any = {};

    if (query.userId) {
      annotationWhere.userId = query.userId;
    }

    // Fetch annotations with time data
    const annotations = await this.annotationRepository.find({
      where: annotationWhere,
      select: ['id', 'taskId', 'userId', 'timeSpent', 'createdAt'],
    });

    // Fetch tasks for cross-referencing project/batch and estimated duration
    const tasks = await this.taskRepository.find({
      select: ['id', 'projectId', 'batchId', 'estimatedDuration', 'actualDuration', 'dataPayload', 'status', 'createdAt'],
    });

    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    // Filter annotations by project/batch/date
    const filtered = annotations.filter((a) => {
      const task = taskMap.get(a.taskId);
      if (!task) return false;
      if (query.projectId && task.projectId !== query.projectId) return false;
      if (query.batchId && task.batchId !== query.batchId) return false;
      if (query.startDate && new Date(a.createdAt) < new Date(query.startDate)) return false;
      if (query.endDate && new Date(a.createdAt) > new Date(query.endDate)) return false;
      return true;
    });

    // ── Annotator metrics ────────────────────────────────────────────────────
    const annotatorMap = new Map<string, { totalTime: number; taskCount: number; tasks: string[] }>();
    filtered.forEach((a) => {
      if (!a.timeSpent) return;
      const existing = annotatorMap.get(a.userId) || { totalTime: 0, taskCount: 0, tasks: [] };
      existing.totalTime += a.timeSpent;
      existing.taskCount += 1;
      existing.tasks.push(a.taskId);
      annotatorMap.set(a.userId, existing);
    });

    const annotatorMetrics = Array.from(annotatorMap.entries()).map(([userId, data]) => ({
      userId,
      totalTimeSeconds: data.totalTime,
      taskCount: data.taskCount,
      avgTimeSeconds: data.taskCount > 0 ? Math.round(data.totalTime / data.taskCount) : 0,
    })).sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);

    // ── Reviewer metrics (from task.dataPayload.context.lastReview.timeSpent) ─
    const reviewerMap = new Map<string, { totalTime: number; reviewCount: number }>();
    const filteredTasks = tasks.filter((t) => {
      if (query.projectId && t.projectId !== query.projectId) return false;
      if (query.batchId && t.batchId !== query.batchId) return false;
      if (query.startDate && new Date(t.createdAt) < new Date(query.startDate)) return false;
      if (query.endDate && new Date(t.createdAt) > new Date(query.endDate)) return false;
      return true;
    });

    filteredTasks.forEach((t) => {
      const review = (t.dataPayload as any)?.context?.lastReview;
      if (!review?.reviewerId || !review?.timeSpent) return;
      if (query.userId && review.reviewerId !== query.userId) return;
      const existing = reviewerMap.get(review.reviewerId) || { totalTime: 0, reviewCount: 0 };
      existing.totalTime += review.timeSpent;
      existing.reviewCount += 1;
      reviewerMap.set(review.reviewerId, existing);
    });

    const reviewerMetrics = Array.from(reviewerMap.entries()).map(([userId, data]) => ({
      userId,
      totalTimeSeconds: data.totalTime,
      reviewCount: data.reviewCount,
      avgTimeSeconds: data.reviewCount > 0 ? Math.round(data.totalTime / data.reviewCount) : 0,
    })).sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);

    // ── Task-level efficiency metrics ────────────────────────────────────────
    const taskMetrics = filteredTasks
      .filter((t) => t.actualDuration || t.estimatedDuration)
      .map((t) => ({
        taskId: t.id,
        projectId: t.projectId,
        batchId: t.batchId,
        status: t.status,
        estimatedDuration: t.estimatedDuration || 0,
        actualDuration: t.actualDuration || 0,
        efficiency: t.estimatedDuration && t.actualDuration
          ? Math.round((t.estimatedDuration / t.actualDuration) * 100)
          : null,
      }))
      .slice(0, 100); // cap at 100 for performance

    // ── Summary ──────────────────────────────────────────────────────────────
    const totalAnnotationTime = annotatorMetrics.reduce((s, a) => s + a.totalTimeSeconds, 0);
    const totalReviewTime = reviewerMetrics.reduce((s, r) => s + r.totalTimeSeconds, 0);

    return {
      annotatorMetrics,
      reviewerMetrics,
      taskMetrics,
      summary: {
        totalAnnotationTimeSeconds: totalAnnotationTime,
        totalReviewTimeSeconds: totalReviewTime,
        avgAnnotationTimeSeconds: annotatorMetrics.length > 0
          ? Math.round(totalAnnotationTime / annotatorMetrics.length)
          : 0,
        avgReviewTimeSeconds: reviewerMetrics.length > 0
          ? Math.round(totalReviewTime / reviewerMetrics.length)
          : 0,
        totalAnnotators: annotatorMetrics.length,
        totalReviewers: reviewerMetrics.length,
        totalTasksAnalyzed: filteredTasks.length,
      },
    };
  }

  /**
   * Reassign a task to a different user (PM action).
   * Marks any active assignment as RELEASED and creates a fresh assignment
   * for the new user, then resets the task status to ASSIGNED.
   */
  async reassignTask(
    taskId: string,
    newUserId: string,
    reason?: string,
    workflowStage?: string,
  ): Promise<{ task: Task; assignment: Assignment }> {
    // CRITICAL: Fetch WITHOUT relations to prevent cascade save issues
    const task = await this.getTaskForUpdate(taskId);

    const newUser = await this.userRepository.findOne({ where: { id: newUserId } });
    if (!newUser) {
      throw new NotFoundException(`User ${newUserId} not found`);
    }

    // Release all active assignments
    const activeAssignments = await this.assignmentRepository.find({
      where: {
        taskId,
        status: In([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]),
      },
    });

    for (const a of activeAssignments) {
      a.status = AssignmentStatus.REASSIGNED;
      await this.assignmentRepository.save(a);
    }

    // Determine stage: preserve current stage if not specified
    const stage = workflowStage
      ? WorkflowStage[workflowStage.toUpperCase() as keyof typeof WorkflowStage]
      : WorkflowStage.ANNOTATION;

    const assignment = this.assignmentRepository.create({
      taskId,
      userId: newUserId,
      workflowStage: stage,
      status: AssignmentStatus.ASSIGNED,
      assignedAt: new Date(),
      expiresAt: new Date(Date.now() + 28800 * 1000),
      assignmentMethod: AssignmentMethod.MANUAL,
      assignmentOrder: activeAssignments.length + 1,
      isPrimary: true,
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    task.status = TaskStatus.ASSIGNED;
    task.assignmentId = savedAssignment.id;
    task.assignedAt = new Date();
    await this.taskRepository.save(task);

    try {
      await this.kafkaService.publishTaskEvent('assigned', task);
      await this.kafkaService.publishNotification({
        userId: newUserId,
        type: 'TASK_ASSIGNED',
        title: 'Task Reassigned to You',
        message: `Task ${task.externalId} has been reassigned to you${reason ? ': ' + reason : ''}`,
        metadata: { taskId: task.id, batchId: task.batchId, projectId: task.projectId },
      });
    } catch (kafkaErr) {
      this.logger.warn(`Kafka publish failed during reassign of task ${taskId}: ${kafkaErr.message}`);
    }

    this.logger.log(`Task ${taskId} reassigned to user ${newUserId}`);
    return { task, assignment: savedAssignment };
  }

  async unassignTask(taskId: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['assignments'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Find ALL active assignments (ASSIGNED or IN_PROGRESS)
    const activeAssignments = task.assignments.filter(
      a => a.status === AssignmentStatus.ASSIGNED || a.status === AssignmentStatus.IN_PROGRESS
    );

    if (activeAssignments.length === 0) {
      this.logger.warn(`No active assignments found for task ${taskId}`);
      return task;
    }

    // Mark ALL active assignments as REASSIGNED
    for (const assignment of activeAssignments) {
      assignment.status = AssignmentStatus.REASSIGNED;
      await this.assignmentRepository.save(assignment);
      this.logger.log(`Released assignment ${assignment.id} for task ${taskId}`);
    }

    // Update task status back to QUEUED
    task.status = TaskStatus.QUEUED;
    task.assignmentId = null;
    task.assignedAt = null;
    
    const updatedTask = await this.taskRepository.save(task);
    
    this.logger.log(`Task ${taskId} unassigned successfully, released ${activeAssignments.length} assignments`);
    return updatedTask;
  }
}
