import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Batch, Task, Project, Assignment, User, Workflow, ProjectTeamMember } from '@app/common/entities';
import { BatchStatus, TaskStatus, TaskType, AssignmentStatus, AssignmentMethod, WorkflowStage, UserStatus, WorkflowStatus } from '@app/common/enums';
import { KafkaService } from '../kafka/kafka.service';
import { CreateBatchDto, UpdateBatchDto, AllocateFilesDto, AllocateFolderDto, ScanDirectoryDto, AssignTaskDto, PullNextTaskDto } from '../dto/batch.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  constructor(
    @InjectRepository(Batch)
    private batchRepository: Repository<Batch>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
    @InjectRepository(ProjectTeamMember)
    private teamMemberRepository: Repository<ProjectTeamMember>,
    private kafkaService: KafkaService,
  ) {}

  /**
   * List all batches, optionally filtered by projectId
   */
  async listBatches(projectId?: string): Promise<Batch[]> {
    if (projectId) {
      return this.batchRepository.find({
        where: { projectId },
        order: { createdAt: 'DESC' },
      });
    }
    return this.batchRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single batch by ID
   */
  async getBatch(batchId: string): Promise<Batch> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    return batch;
  }

  async createBatch(dto: CreateBatchDto): Promise<Batch> {
    const project = await this.projectRepository.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    const batch = this.batchRepository.create({
      projectId: dto.projectId,
      name: dto.name,
      description: dto.description,
      priority: dto.priority || 5,
      dueDate: dto.dueDate,
      configuration: dto.configuration || {},
      status: BatchStatus.CREATED,
      totalTasks: 0,
      completedTasks: 0,
    });

    const savedBatch = await this.batchRepository.save(batch);

    // Publish Kafka event
    await this.kafkaService.publishBatchEvent('created', savedBatch);

    this.logger.log(`Batch created: ${savedBatch.id}`);
    return savedBatch;
  }

  async updateBatch(batchId: string, dto: UpdateBatchDto): Promise<Batch> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    Object.assign(batch, dto);
    const updatedBatch = await this.batchRepository.save(batch);

    // Publish Kafka event
    await this.kafkaService.publishBatchEvent('updated', updatedBatch);

    this.logger.log(`Batch updated: ${batchId}`);
    return updatedBatch;
  }

  async allocateFiles(batchId: string, dto: AllocateFilesDto): Promise<Task[]> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
      relations: ['project'],
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    const project = batch.project;
    const tasks: Task[] = [];

    // Get default workflow for the project
    const workflow = await this.getProjectWorkflow(project.id);

    for (const file of dto.files) {
      const task = this.taskRepository.create({
        batchId: batch.id,
        projectId: project.id,
        workflowId: workflow.id,
        externalId: file.externalId,
        taskType: dto.taskType ? TaskType[dto.taskType.toUpperCase()] : TaskType.ANNOTATION,
        status: TaskStatus.QUEUED,
        priority: dto.priority || batch.priority,
        dueDate: dto.dueDate || batch.dueDate,
        fileType: file.fileType,
        fileUrl: file.fileUrl,
        fileMetadata: {
          fileName: file.fileName,
          fileSize: file.fileSize,
          ...file.metadata,
        },
        dataPayload: {
          sourceData: { file },
          references: [],
          context: {},
        },
        machineState: {
          value: 'queued',
          context: {},
          done: false,
          changed: false,
        },
        totalAssignmentsRequired: project.configuration?.workflowConfiguration?.annotatorsPerTask || 1,
        completedAssignments: 0,
        maxReviewLevel: project.configuration?.workflowConfiguration?.reviewLevels?.length || 0,
        currentReviewLevel: 0,
      });

      tasks.push(task);
    }

    const savedTasks = await this.taskRepository.save(tasks);

    // Update batch task count
    batch.totalTasks += savedTasks.length;
    await this.batchRepository.save(batch);

    // Publish Kafka events for each task
    for (const task of savedTasks) {
      await this.kafkaService.publishTaskEvent('created', task);
    }

    this.logger.log(`Allocated ${savedTasks.length} files to batch ${batchId}`);

    // Auto-assign if requested
    if (dto.autoAssign) {
      const assignmentMethod = dto.assignmentMethod || 'AUTO_ROUND_ROBIN';
      await this.autoAssignTasks(savedTasks, assignmentMethod);
    }

    return savedTasks;
  }

  async allocateFolder(batchId: string, dto: AllocateFolderDto): Promise<Task[]> {
    // This would require file system access or cloud storage integration
    // For now, this is a placeholder that would be implemented based on storage backend
    throw new BadRequestException('Folder allocation requires storage backend integration');
  }

  /**
   * TACTICAL DEMO MODE: Scan directory and create tasks for files
   * Scans /media/{projectId}/{batchName}/ and creates tasks
   */
  async scanDirectoryAndCreateTasks(batchId: string, dto: ScanDirectoryDto): Promise<{
    tasks: Task[];
    scannedFiles: number;
    createdTasks: number;
    errors: string[];
  }> {
    // Check if directory scan is enabled
    const directoryScanEnabled = process.env.ENABLE_DIRECTORY_SCAN === 'true';
    if (!directoryScanEnabled) {
      throw new BadRequestException(
        'Directory scan mode is disabled. Set ENABLE_DIRECTORY_SCAN=true to enable.'
      );
    }

    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
      relations: ['project'],
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    const project = batch.project;
    const mediaBasePath = process.env.MEDIA_FILES_PATH || '/app/media';
    
    // Determine directory path
    let scanPath: string;
    if (dto.directoryPath) {
      // Custom path provided
      scanPath = path.join(mediaBasePath, dto.directoryPath);
    } else {
      // Default: /media/{projectId}/{batchName}
      const sanitizedBatchName = batch.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      scanPath = path.join(mediaBasePath, project.id, sanitizedBatchName);
    }

    this.logger.log(`Scanning directory: ${scanPath}`);

    // Check if directory exists
    if (!fs.existsSync(scanPath)) {
      throw new NotFoundException(
        `Directory not found: ${scanPath}. Please create the directory and place files there.`
      );
    }

    // Read files from directory
    const files = fs.readdirSync(scanPath);
    const errors: string[] = [];
    const tasks: Task[] = [];

    // Filter files based on pattern
    let filteredFiles = files.filter(file => {
      const fullPath = path.join(scanPath, file);
      const stat = fs.statSync(fullPath);
      return stat.isFile();
    });

    if (dto.filePattern) {
      const pattern = new RegExp(dto.filePattern.replace('*', '.*'));
      filteredFiles = filteredFiles.filter(file => pattern.test(file));
    }

    this.logger.log(`Found ${filteredFiles.length} files to process`);

    // Get workflow for the project
    const workflow = await this.getProjectWorkflow(project.id);

    // Create tasks for each file
    for (const fileName of filteredFiles) {
      try {
        const filePath = path.join(scanPath, fileName);
        const stats = fs.statSync(filePath);
        const fileExt = path.extname(fileName).toLowerCase();
        
        // Detect file type
        const fileType = this.detectFileType(fileExt);
        
        // Construct file URL for media endpoint
        const relativePath = dto.directoryPath 
          ? `${dto.directoryPath}/${fileName}`
          : `${project.id}/${batch.name.replace(/[^a-zA-Z0-9-_]/g, '_')}/${fileName}`;
        
        const fileUrl = `http://localhost:3004/api/v1/media/${relativePath}`;

        const task = this.taskRepository.create({
          batchId: batch.id,
          projectId: project.id,
          workflowId: workflow.id,
          externalId: `${batch.name}_${fileName}`,
          taskType: dto.taskType ? TaskType[dto.taskType.toUpperCase()] : TaskType.ANNOTATION,
          status: TaskStatus.QUEUED,
          priority: batch.priority,
          dueDate: batch.dueDate,
          fileType: fileType,
          fileUrl: fileUrl,
          fileMetadata: {
            fileName: fileName,
            fileSize: stats.size,
            mimeType: this.getMimeType(fileExt),
          },
          dataPayload: {
            sourceData: { fileName, filePath: relativePath },
            references: [],
            context: { 
              scanMode: 'directory', 
              batchId: batch.id,
              scannedFrom: scanPath,
              scannedAt: new Date().toISOString(),
            },
          },
          machineState: {
            value: 'queued',
            context: {},
            done: false,
            changed: false,
          },
          totalAssignmentsRequired: project.configuration?.workflowConfiguration?.annotatorsPerTask || 1,
          completedAssignments: 0,
          maxReviewLevel: project.configuration?.workflowConfiguration?.reviewLevels?.length || 0,
          currentReviewLevel: 0,
        });

        tasks.push(task);
      } catch (error) {
        this.logger.error(`Failed to process file ${fileName}:`, error);
        errors.push(`${fileName}: ${error.message}`);
      }
    }

    // Save all tasks
    const savedTasks = await this.taskRepository.save(tasks);

    // Update batch task count
    batch.totalTasks += savedTasks.length;
    await this.batchRepository.save(batch);

    // Publish Kafka events
    for (const task of savedTasks) {
      await this.kafkaService.publishTaskEvent('created', task);
    }

    this.logger.log(
      `Created ${savedTasks.length} tasks from ${filteredFiles.length} files in batch ${batchId}`
    );

    // Auto-assign if requested
    if (dto.autoAssign) {
      const assignmentMethod = dto.assignmentMethod || 'AUTO_ROUND_ROBIN';
      await this.autoAssignTasks(savedTasks, assignmentMethod);
    }

    return {
      tasks: savedTasks,
      scannedFiles: filteredFiles.length,
      createdTasks: savedTasks.length,
      errors,
    };
  }

  /**
   * Detect file type from extension
   */
  private detectFileType(ext: string): string {
    const typeMap: Record<string, string> = {
      '.jpg': 'IMAGE',
      '.jpeg': 'IMAGE',
      '.png': 'IMAGE',
      '.gif': 'IMAGE',
      '.webp': 'IMAGE',
      '.svg': 'IMAGE',
      '.mp4': 'VIDEO',
      '.webm': 'VIDEO',
      '.avi': 'VIDEO',
      '.mov': 'VIDEO',
      '.mp3': 'AUDIO',
      '.wav': 'AUDIO',
      '.ogg': 'AUDIO',
      '.pdf': 'PDF',
      '.txt': 'TEXT',
      '.csv': 'CSV',
      '.json': 'JSON',
    };
    return typeMap[ext] || 'TEXT';
  }

  /**
   * Get MIME type from extension
   */
  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async getUnassignedTasksForBatch(batchId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: {
        batchId,
        status: TaskStatus.QUEUED,
      },
    });
  }

  async autoAssignTasks(tasks: Task[], method: string): Promise<void> {
    const assignmentMethod = method as 'AUTO_ROUND_ROBIN' | 'AUTO_SKILL_BASED' | 'AUTO_WORKLOAD_BASED';

    // CRITICAL: Track assignments in memory to ensure proper round-robin distribution
    // Without this, all tasks get assigned to the same user because DB isn't updated yet
    const pendingAssignments = new Map<string, number>(); // userId -> count

    for (const task of tasks) {
      try {
        // Get project to determine how many annotators are required per task
        const project = await this.projectRepository.findOne({
          where: { id: task.projectId },
        });

        if (!project) {
          this.logger.warn(`Project ${task.projectId} not found for task ${task.id}`);
          continue;
        }

        // Get current workflow stage configuration
        const workflowStages = (project.configuration?.workflowConfiguration as any)?.stages || [];
        const currentStageId = task.machineState?.context?.currentStage;
        
        // Find the current stage config
        const currentStage = workflowStages.find((s: any) => s.id === currentStageId) || workflowStages[0];
        
        // Determine how many assignments to create
        const assignmentsRequired = currentStage?.annotators_count || 1;

        this.logger.log(`Task ${task.id}: Creating ${assignmentsRequired} assignments for stage ${currentStage?.name}`);

        // Create multiple assignments for the task, passing pending assignments map
        const selectedUserIds = await this.selectUsersForAssignment(
          task,
          assignmentMethod,
          assignmentsRequired,
          pendingAssignments
        );

        if (selectedUserIds.length === 0) {
          this.logger.warn(`No users selected for task ${task.id}`);
          continue;
        }

        // Assign task to each selected user
        for (let i = 0; i < selectedUserIds.length; i++) {
          const userId = selectedUserIds[i];
          await this.assignTaskToUser(task.id, userId, assignmentMethod);
          
          // Track this assignment in memory
          pendingAssignments.set(userId, (pendingAssignments.get(userId) || 0) + 1);
          
          this.logger.log(`Task ${task.id} assigned to user ${userId} (${i + 1}/${assignmentsRequired})`);
        }
      } catch (error) {
        this.logger.error(`Failed to auto-assign task ${task.id}`, error);
      }
    }
  }

  /**
   * Select multiple users for assignment based on method and required count
   */
  private async selectUsersForAssignment(
    task: Task,
    method: string,
    count: number,
    pendingAssignments?: Map<string, number>
  ): Promise<string[]> {
    const project = await this.projectRepository.findOne({
      where: { id: task.projectId },
    });

    if (!project) {
      return [];
    }

    // Determine workflow stage based on task status
    const workflowStage = task.status === TaskStatus.SUBMITTED 
      ? WorkflowStage.REVIEW 
      : WorkflowStage.ANNOTATION;

    // Get eligible users (project team members with appropriate role)
    const eligibleUsers = await this.getEligibleUsers(project.id, workflowStage);

    if (eligibleUsers.length === 0) {
      this.logger.warn(`No eligible users found for project ${project.id} at stage ${workflowStage}`);
      return [];
    }

    // Ensure we don't try to assign more users than available
    const actualCount = Math.min(count, eligibleUsers.length);

    switch (method) {
      case 'AUTO_ROUND_ROBIN':
        return this.roundRobinMultiSelection(eligibleUsers, task, actualCount, pendingAssignments);
      case 'AUTO_SKILL_BASED':
        return this.skillBasedMultiSelection(eligibleUsers, task, actualCount, pendingAssignments);
      case 'AUTO_WORKLOAD_BASED':
        return this.workloadBasedMultiSelection(eligibleUsers, task, actualCount, pendingAssignments);
      default:
        return this.roundRobinMultiSelection(eligibleUsers, task, actualCount, pendingAssignments);
    }
  }

  /**
   * Select multiple users using round-robin strategy
   * CRITICAL: Counts assignments PER PROJECT, not globally
   * CRITICAL: Includes pending assignments to prevent assigning all tasks to same user
   */
  private async roundRobinMultiSelection(
    users: User[], 
    task: Task, 
    count: number,
    pendingAssignments?: Map<string, number>
  ): Promise<string[]> {
    // Get assignment counts for each user IN THIS PROJECT ONLY
    const assignmentCounts = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.task', 'task')
      .select('assignment.userId', 'userId')
      .addSelect('COUNT(assignment.id)', 'count')
      .where('assignment.status IN (:...statuses)', {
        statuses: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
      })
      .andWhere('task.projectId = :projectId', { projectId: task.projectId })
      .groupBy('assignment.userId')
      .getRawMany();

    const countMap = new Map(assignmentCounts.map((ac) => [ac.userId, parseInt(ac.count)]));

    // Add pending assignments (in-memory) to the count
    if (pendingAssignments) {
      for (const [userId, pendingCount] of pendingAssignments.entries()) {
        countMap.set(userId, (countMap.get(userId) || 0) + pendingCount);
      }
    }

    this.logger.debug(`Round-robin for project ${task.projectId}: ${JSON.stringify(Array.from(countMap.entries()))}`);

    // Sort users by current assignment count (ascending)
    const sortedUsers = [...users].sort((a, b) => {
      const countA = countMap.get(a.id) || 0;
      const countB = countMap.get(b.id) || 0;
      return countA - countB;
    });

    // Select the first N users with lowest assignment counts
    return sortedUsers.slice(0, count).map(u => u.id);
  }

  /**
   * Select multiple users using skill-based strategy
   */
  private async skillBasedMultiSelection(
    users: User[], 
    task: Task, 
    count: number,
    pendingAssignments?: Map<string, number>
  ): Promise<string[]> {
    // For now, fallback to round-robin
    this.logger.debug('Skill-based multi-selection not implemented, using round-robin');
    return this.roundRobinMultiSelection(users, task, count, pendingAssignments);
  }

  /**
   * Select multiple users using workload-based strategy
   * CRITICAL: Calculates workload PER PROJECT, not globally
   * CRITICAL: Includes pending assignments to prevent assigning all tasks to same user
   */
  private async workloadBasedMultiSelection(
    users: User[], 
    task: Task, 
    count: number,
    pendingAssignments?: Map<string, number>
  ): Promise<string[]> {
    // Calculate current workload for each user IN THIS PROJECT ONLY
    const workloads = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.task', 'task')
      .select('assignment.userId', 'userId')
      .addSelect('SUM(EXTRACT(EPOCH FROM (assignment.expiresAt - assignment.assignedAt)))', 'totalTimeSeconds')
      .where('assignment.status IN (:...statuses)', {
        statuses: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
      })
      .andWhere('task.projectId = :projectId', { projectId: task.projectId })
      .groupBy('assignment.userId')
      .getRawMany();

    const workloadMap = new Map(
      workloads.map((w) => [w.userId, parseFloat(w.totalTimeSeconds) || 0])
    );

    // Add pending assignments (estimated 1 hour each)
    if (pendingAssignments) {
      for (const [userId, pendingCount] of pendingAssignments.entries()) {
        const estimatedTime = pendingCount * 3600; // 1 hour per task
        workloadMap.set(userId, (workloadMap.get(userId) || 0) + estimatedTime);
      }
    }

    // Sort users by workload (ascending)
    const sortedUsers = [...users].sort((a, b) => {
      const workloadA = workloadMap.get(a.id) || 0;
      const workloadB = workloadMap.get(b.id) || 0;
      return workloadA - workloadB;
    });

    // Select users with lowest workload
    return sortedUsers.slice(0, count).map(u => u.id);
  }

  // Keep old single-user methods for backward compatibility
  private async selectUserForAssignment(task: Task, method: string): Promise<string | null> {
    const users = await this.selectUsersForAssignment(task, method, 1);
    return users[0] || null;
  }

  private async getEligibleUsers(projectId: string, workflowStage: WorkflowStage): Promise<User[]> {
    // Determine required role based on workflow stage
    const requiredRole = workflowStage === WorkflowStage.REVIEW ? 'REVIEWER' : 'ANNOTATOR';

    // Query project team members with the appropriate role
    const teamMembers = await this.teamMemberRepository.find({
      where: {
        projectId,
        role: requiredRole,
        isActive: true,
      },
      relations: ['user'],
    });

    // Filter to only active users and extract user entities
    const eligibleUsers = teamMembers
      .filter(member => member.user && member.user.status === UserStatus.ACTIVE)
      .map(member => member.user);

    this.logger.debug(`Found ${eligibleUsers.length} eligible ${requiredRole}s for project ${projectId}`);
    return eligibleUsers;
  }

  private async roundRobinSelection(users: User[], task: Task): Promise<string> {
    // Get assignment counts for each user IN THIS PROJECT ONLY
    const assignmentCounts = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.task', 'task')
      .select('assignment.userId', 'userId')
      .addSelect('COUNT(assignment.id)', 'count')
      .where('assignment.status IN (:...statuses)', {
        statuses: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
      })
      .andWhere('task.projectId = :projectId', { projectId: task.projectId })
      .groupBy('assignment.userId')
      .getRawMany();

    const countMap = new Map(assignmentCounts.map((ac) => [ac.userId, parseInt(ac.count)]));

    // Find user with minimum assignments
    let minCount = Infinity;
    let selectedUserId = users[0].id;

    for (const user of users) {
      const count = countMap.get(user.id) || 0;
      if (count < minCount) {
        minCount = count;
        selectedUserId = user.id;
      }
    }

    return selectedUserId;
  }

  private async skillBasedSelection(users: User[], task: Task): Promise<string> {
    // This would implement skill-based selection
    // For now, fallback to round-robin
    this.logger.debug('Skill-based selection not implemented, using round-robin');
    return this.roundRobinSelection(users, task);
  }

  private async workloadBasedSelection(users: User[], task: Task): Promise<string> {
    // Calculate current workload for each user IN THIS PROJECT ONLY
    const workloads = await this.assignmentRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.task', 'task')
      .select('assignment.userId', 'userId')
      .addSelect('COUNT(assignment.id)', 'activeCount')
      .where('assignment.status IN (:...statuses)', {
        statuses: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
      })
      .andWhere('task.projectId = :projectId', { projectId: task.projectId })
      .groupBy('assignment.userId')
      .getRawMany();

    const workloadMap = new Map(workloads.map((w) => [w.userId, parseInt(w.activeCount)]));

    // Find user with minimum workload
    let minWorkload = Infinity;
    let selectedUserId = users[0].id;

    for (const user of users) {
      const workload = workloadMap.get(user.id) || 0;
      if (workload < minWorkload) {
        minWorkload = workload;
        selectedUserId = user.id;
      }
    }

    return selectedUserId;
  }

  async assignTask(dto: AssignTaskDto): Promise<Assignment> {
    const task = await this.taskRepository.findOne({
      where: { id: dto.taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${dto.taskId} not found`);
    }

    let userId = dto.userId;

    // If no user specified, use auto-assignment
    if (!userId) {
      const project = task.project;
      // Default to round-robin if no specific method is configured
      const assignmentMethod = 'AUTO_ROUND_ROBIN';
      userId = await this.selectUserForAssignment(task, assignmentMethod);
    }

    if (!userId) {
      throw new BadRequestException('No eligible user found for assignment');
    }

    return this.assignTaskToUser(dto.taskId, userId, dto.workflowStage);
  }

  private async assignTaskToUser(taskId: string, userId: string, methodOrStage?: any): Promise<Assignment> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Check if task is already assigned
    const existingAssignment = await this.assignmentRepository.findOne({
      where: {
        taskId: task.id,
        userId: userId,
        status: In([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]),
      },
    });

    if (existingAssignment) {
      this.logger.warn(`Task ${taskId} already assigned to user ${userId}`);
      return existingAssignment;
    }

    // Determine assignment order
    const assignmentCount = await this.assignmentRepository.count({
      where: { taskId: task.id },
    });

    const assignment = this.assignmentRepository.create({
      taskId: task.id,
      userId: userId,
      workflowStage: WorkflowStage.ANNOTATION,
      status: AssignmentStatus.ASSIGNED,
      assignedAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours default
      assignmentMethod: typeof methodOrStage === 'string' && methodOrStage.startsWith('AUTO') 
        ? AssignmentMethod.AUTOMATIC 
        : AssignmentMethod.MANUAL,
      assignmentOrder: assignmentCount + 1,
      isPrimary: assignmentCount === 0,
      requiresConsensus: task.requiresConsensus || false,
      consensusGroupId: task.id, // Use task ID as consensus group
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    // Update task status
    task.status = TaskStatus.ASSIGNED;
    task.assignmentId = savedAssignment.id;
    task.assignedAt = new Date();

    // Initialize machine state with currentStage if not already set
    const workflowStages = (task.project?.configuration?.workflowConfiguration as any)?.stages;
    if (workflowStages && workflowStages.length > 0) {
      const currentStage =  task.machineState?.context?.currentStage;
      if (!currentStage) {
        // Set to first workflow stage
        task.machineState = {
          ...task.machineState,
          value: 'assigned',
          context: {
            ...task.machineState?.context,
            currentStage: workflowStages[0].id,
            stageTransitionedAt: new Date().toISOString(),
          },
        };
        this.logger.log(`Task ${taskId} initialized with workflow stage: ${workflowStages[0].name}`);
      }
    }

    await this.taskRepository.save(task);

    // Publish Kafka events
    await this.kafkaService.publishTaskEvent('assigned', task);
    await this.kafkaService.publishAssignmentEvent('created', savedAssignment);

    // Send notification to user
    await this.kafkaService.publishNotification({
      userId: userId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${task.externalId}`,
      metadata: {
        taskId: task.id,
        batchId: task.batchId,
        projectId: task.projectId,
      },
    });

    this.logger.log(`Task ${taskId} assigned to user ${userId}`);
    return savedAssignment;
  }

  async pullNextTask(dto: PullNextTaskDto): Promise<Task | null> {
    // Find next available task for the user
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.project', 'project')
      .where('task.status = :status', { status: TaskStatus.QUEUED })
      .andWhere('task.projectId IN (SELECT project_id FROM project_members WHERE user_id = :userId)', {
        userId: dto.userId,
      })
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.createdAt', 'ASC');

    if (dto.taskType) {
      query.andWhere('task.taskType = :taskType', { taskType: dto.taskType });
    }

    const task = await query.getOne();

    if (!task) {
      this.logger.debug(`No available tasks for user ${dto.userId}`);
      return null;
    }

    // Auto-assign the task to the user
    await this.assignTaskToUser(task.id, dto.userId, AssignmentMethod.MANUAL);

    return this.taskRepository.findOne({
      where: { id: task.id },
      relations: ['batch', 'project'],
    });
  }

  async getBatchStatistics(batchId: string): Promise<any> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    const tasks = await this.taskRepository.find({
      where: { batchId: batch.id },
    });

    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const assignments = await this.assignmentRepository.find({
      where: {
        taskId: In(tasks.map((t) => t.id)),
      },
    });

    const assignmentBreakdown = assignments.reduce(
      (acc, assignment) => {
        if (assignment.assignmentMethod === AssignmentMethod.MANUAL) {
          acc.manual++;
        } else {
          acc.autoAssigned++;
        }
        return acc;
      },
      { manual: 0, autoAssigned: 0, unassigned: tasks.length - assignments.length },
    );

    const completedTasks = tasks.filter((t) => t.status === TaskStatus.APPROVED);
    const averageTaskDuration =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTasks.length
        : 0;

    return {
      batchId: batch.id,
      totalTasks: batch.totalTasks,
      completedTasks: batch.completedTasks,
      inProgressTasks: statusCounts[TaskStatus.IN_PROGRESS] || 0,
      queuedTasks: statusCounts[TaskStatus.QUEUED] || 0,
      failedTasks: statusCounts[TaskStatus.REJECTED] || 0,
      completionPercentage: batch.totalTasks > 0 ? (batch.completedTasks / batch.totalTasks) * 100 : 0,
      averageTaskDuration,
      qualityScore: batch.qualityScore || 0,
      assignmentBreakdown,
    };
  }

  private async getProjectWorkflow(projectId: string): Promise<Workflow> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['defaultWorkflow'],
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // If project has a default workflow, use it
    if (project.defaultWorkflowId) {
      const workflow = await this.workflowRepository.findOne({
        where: { id: project.defaultWorkflowId },
      });
      if (workflow) {
        return workflow;
      }
    }

    // Otherwise, find or create a workflow for this project
    let workflow = await this.workflowRepository.findOne({
      where: { projectId, status: WorkflowStatus.ACTIVE },
    });

    if (!workflow) {
      // Create a default workflow for this project
      workflow = this.workflowRepository.create({
        projectId,
        name: `${project.name} - Default Workflow`,
        description: 'Auto-generated default workflow',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        isTemplate: false,
        createdBy: project.createdBy,
        xstateDefinition: {
          id: 'taskWorkflow',
          initial: 'queued',
          states: {
            queued: {
              on: { ASSIGN: 'assigned' },
            },
            assigned: {
              on: { START: 'in_progress', UNASSIGN: 'queued' },
            },
            in_progress: {
              on: { SUBMIT: 'submitted', CANCEL: 'queued' },
            },
            submitted: {
              on: { APPROVE: 'approved', REJECT: 'rejected' },
            },
            approved: {
              type: 'final' as any,
            },
            rejected: {
              on: { REASSIGN: 'queued' },
            },
          },
        },
      });

      workflow = await this.workflowRepository.save(workflow);
      this.logger.log(`Created default workflow ${workflow.id} for project ${projectId}`);
    }

    return workflow;
  }

  async completeBatch(batchId: string): Promise<Batch> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    batch.status = BatchStatus.COMPLETED;
    batch.completedAt = new Date();

    const updatedBatch = await this.batchRepository.save(batch);

    // Publish Kafka event
    await this.kafkaService.publishBatchEvent('completed', updatedBatch);

    this.logger.log(`Batch completed: ${batchId}`);
    return updatedBatch;
  }
}
