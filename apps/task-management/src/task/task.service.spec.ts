import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

import { TaskService } from './task.service';
import { TaskRenderingService } from '../services/task-rendering.service';
import { KafkaService } from '@app/infrastructure';
import {
  Task,
  Assignment,
  Annotation,
  AnnotationResponse,
  Project,
  Batch,
  Workflow,
  User,
  Queue,
} from '@app/common/entities';
import {
  TaskStatus,
  TaskType,
  AssignmentStatus,
  AssignmentMethod,
  WorkflowStage,
} from '@app/common/enums';
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
} from '../dto/task.dto';

// ─── Query Builder factory ────────────────────────────────────────────────────
function createMockQueryBuilder(overrides: Partial<SelectQueryBuilder<any>> = {}): jest.Mocked<SelectQueryBuilder<any>> {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 'new-assignment-id' }] }),
    ...overrides,
  };
  return qb;
}

// ─── Fixture helpers ──────────────────────────────────────────────────────────
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-id',
    batchId: 'batch-id',
    projectId: 'project-id',
    workflowId: 'workflow-id',
    externalId: 'ext-001',
    taskType: TaskType.ANNOTATION,
    status: TaskStatus.QUEUED,
    priority: 5,
    requiresConsensus: false,
    totalAssignmentsRequired: 1,
    completedAssignments: 0,
    maxReviewLevel: 0,
    currentReviewLevel: 0,
    machineState: { value: 'queued', context: { taskId: 'task-id', projectId: 'project-id', batchId: 'batch-id' }, done: false, changed: false },
    previousState: null,
    stateUpdatedAt: null,
    assignmentId: null,
    assignedAt: null,
    submittedAt: null,
    allReviewsApproved: false,
    consensusScore: null,
    consensusReached: false,
    fileMetadata: { fileName: 'test.csv' },
    dataPayload: { sourceData: {}, context: {} },
    estimatedDuration: null,
    actualDuration: null,
    attemptCount: 0,
    assignments: [],
    annotations: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
  } as any as Task;
}

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'assignment-id',
    taskId: 'task-id',
    userId: 'user-id',
    workflowStage: WorkflowStage.ANNOTATION,
    status: AssignmentStatus.ASSIGNED,
    assignedAt: new Date(),
    expiresAt: new Date(Date.now() + 8 * 3600 * 1000),
    assignmentMethod: AssignmentMethod.MANUAL,
    assignmentOrder: 1,
    isPrimary: true,
    requiresConsensus: false,
    consensusGroupId: 'task-id',
    completedAt: null,
    ...overrides,
  } as any as Assignment;
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-id',
    configuration: {
      workflowConfiguration: {
        annotatorsPerTask: 1,
        reviewLevels: [],
      },
    },
    ...overrides,
  } as any as Project;
}

function makeBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'batch-id',
    totalTasks: 5,
    completedTasks: 0,
    ...overrides,
  } as any as Batch;
}

function makeWorkflow(): Workflow {
  return { id: 'workflow-id' } as any as Workflow;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let assignmentRepository: jest.Mocked<Repository<Assignment>>;
  let annotationRepository: jest.Mocked<Repository<Annotation>>;
  let responseRepository: jest.Mocked<Repository<AnnotationResponse>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let batchRepository: jest.Mocked<Repository<Batch>>;
  let workflowRepository: jest.Mocked<Repository<Workflow>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let queueRepository: jest.Mocked<Repository<Queue>>;
  let kafkaService: jest.Mocked<KafkaService>;
  let taskRenderingService: jest.Mocked<TaskRenderingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Annotation),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AnnotationResponse),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Batch),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Workflow),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Queue),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: KafkaService,
          useValue: {
            publishTaskEvent: jest.fn().mockResolvedValue(undefined),
            publishNotification: jest.fn().mockResolvedValue(undefined),
            publishAnnotationEvent: jest.fn().mockResolvedValue(undefined),
            publishQualityCheckRequest: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: TaskRenderingService,
          useValue: {
            getTaskRenderConfig: jest.fn(),
            saveAnnotationResponse: jest.fn(),
            saveReviewDecision: jest.fn(),
            getTaskAnnotationHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepository = module.get(getRepositoryToken(Task));
    assignmentRepository = module.get(getRepositoryToken(Assignment));
    annotationRepository = module.get(getRepositoryToken(Annotation));
    responseRepository = module.get(getRepositoryToken(AnnotationResponse));
    projectRepository = module.get(getRepositoryToken(Project));
    batchRepository = module.get(getRepositoryToken(Batch));
    workflowRepository = module.get(getRepositoryToken(Workflow));
    userRepository = module.get(getRepositoryToken(User));
    queueRepository = module.get(getRepositoryToken(Queue));
    kafkaService = module.get(KafkaService);
    taskRenderingService = module.get(TaskRenderingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── createTask ──────────────────────────────────────────────────────────────
  describe('createTask', () => {
    const dto: CreateTaskDto = {
      projectId: 'project-id',
      batchId: 'batch-id',
      workflowId: 'workflow-id',
      externalId: 'ext-001',
      taskType: 'ANNOTATION',
      dataPayload: { sourceData: { text: 'sample' }, context: {} },
    };

    it('should create and return a task', async () => {
      const project = makeProject();
      const batch = makeBatch();
      const task = makeTask();

      projectRepository.findOne.mockResolvedValue(project);
      batchRepository.findOne.mockResolvedValue(batch);
      workflowRepository.findOne.mockResolvedValue(makeWorkflow());
      taskRepository.findOne.mockResolvedValueOnce(null); // duplicate check
      taskRepository.create.mockReturnValue(task);
      taskRepository.save
        .mockResolvedValueOnce(task) // first save
        .mockResolvedValueOnce(task); // second save (update context)
      batchRepository.save.mockResolvedValue(batch);

      const result = await service.createTask(dto);

      expect(result).toEqual(task);
      expect(taskRepository.save).toHaveBeenCalledTimes(2);
      expect(batchRepository.save).toHaveBeenCalledWith(expect.objectContaining({ totalTasks: 6 }));
      expect(kafkaService.publishTaskEvent).toHaveBeenCalledWith('created', task);
    });

    it('should use provided priority, totalAssignmentsRequired, and other optional fields', async () => {
      const fullDto: CreateTaskDto = {
        ...dto,
        taskType: 'review',
        priority: 8,
        requiresConsensus: true,
        totalAssignmentsRequired: 3,
        dueDate: new Date('2025-12-31'),
        fileType: 'IMAGE',
        fileUrl: 'https://storage.example.com/img.png',
        fileName: 'img.png',
        fileSize: 1024,
        fileMetadata: { width: 800, height: 600 },
        estimatedDuration: 300,
      };
      const project = makeProject({ configuration: { workflowConfiguration: { annotatorsPerTask: 2, reviewLevels: [1, 2] } } } as any);
      const task = makeTask();

      projectRepository.findOne.mockResolvedValue(project);
      batchRepository.findOne.mockResolvedValue(makeBatch());
      workflowRepository.findOne.mockResolvedValue(makeWorkflow());
      taskRepository.findOne.mockResolvedValueOnce(null);
      taskRepository.create.mockReturnValue(task);
      taskRepository.save.mockResolvedValue(task);
      batchRepository.save.mockResolvedValue(makeBatch());

      const result = await service.createTask(fullDto);

      expect(result).toBeDefined();
      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 8,
          requiresConsensus: true,
          totalAssignmentsRequired: 3,
        }),
      );
    });

    it('should fall back to TaskType.ANNOTATION for unknown taskType', async () => {
      const unknownDto: CreateTaskDto = { ...dto, taskType: 'UNKNOWN_TYPE' };
      const task = makeTask();

      projectRepository.findOne.mockResolvedValue(makeProject());
      batchRepository.findOne.mockResolvedValue(makeBatch());
      workflowRepository.findOne.mockResolvedValue(makeWorkflow());
      taskRepository.findOne.mockResolvedValueOnce(null);
      taskRepository.create.mockReturnValue(task);
      taskRepository.save.mockResolvedValue(task);
      batchRepository.save.mockResolvedValue(makeBatch());

      await service.createTask(unknownDto);

      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ taskType: TaskType.ANNOTATION }),
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.createTask(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when batch not found', async () => {
      projectRepository.findOne.mockResolvedValue(makeProject());
      batchRepository.findOne.mockResolvedValue(null);

      await expect(service.createTask(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      projectRepository.findOne.mockResolvedValue(makeProject());
      batchRepository.findOne.mockResolvedValue(makeBatch());
      workflowRepository.findOne.mockResolvedValue(null);

      await expect(service.createTask(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when external ID already exists in batch', async () => {
      projectRepository.findOne.mockResolvedValue(makeProject());
      batchRepository.findOne.mockResolvedValue(makeBatch());
      workflowRepository.findOne.mockResolvedValue(makeWorkflow());
      taskRepository.findOne.mockResolvedValueOnce(makeTask()); // duplicate found

      await expect(service.createTask(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ─── createTasksBulk ─────────────────────────────────────────────────────────
  describe('createTasksBulk', () => {
    it('should return created tasks and empty errors when all succeed', async () => {
      const dto: CreateTaskBulkDto = {
        tasks: [
          { projectId: 'p', batchId: 'b', workflowId: 'w', externalId: 'e1', taskType: 'ANNOTATION', dataPayload: { sourceData: {} } },
          { projectId: 'p', batchId: 'b', workflowId: 'w', externalId: 'e2', taskType: 'ANNOTATION', dataPayload: { sourceData: {} } },
        ],
      };

      const task1 = makeTask({ externalId: 'e1' });
      const task2 = makeTask({ id: 'task-id-2', externalId: 'e2' });

      projectRepository.findOne.mockResolvedValue(makeProject());
      batchRepository.findOne.mockResolvedValue(makeBatch());
      workflowRepository.findOne.mockResolvedValue(makeWorkflow());
      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.create
        .mockReturnValueOnce(task1)
        .mockReturnValueOnce(task2);
      taskRepository.save
        .mockResolvedValueOnce(task1).mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task2).mockResolvedValueOnce(task2);
      batchRepository.save.mockResolvedValue(makeBatch());

      const result = await service.createTasksBulk(dto);

      expect(result.created).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect errors for failed task creations', async () => {
      const dto: CreateTaskBulkDto = {
        tasks: [
          { projectId: 'p', batchId: 'b', workflowId: 'w', externalId: 'e1', taskType: 'ANNOTATION', dataPayload: { sourceData: {} } },
          { projectId: 'p', batchId: 'b', workflowId: 'w', externalId: 'e2', taskType: 'ANNOTATION', dataPayload: { sourceData: {} } },
        ],
      };

      // First task succeeds
      projectRepository.findOne
        .mockResolvedValueOnce(makeProject())
        .mockResolvedValueOnce(null); // second task project not found
      batchRepository.findOne.mockResolvedValue(makeBatch());
      workflowRepository.findOne.mockResolvedValue(makeWorkflow());
      taskRepository.findOne.mockResolvedValue(null);
      const task1 = makeTask();
      taskRepository.create.mockReturnValue(task1);
      taskRepository.save.mockResolvedValue(task1);
      batchRepository.save.mockResolvedValue(makeBatch());

      const result = await service.createTasksBulk(dto);

      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].externalId).toBe('e2');
    });
  });

  // ─── getTask ─────────────────────────────────────────────────────────────────
  describe('getTask', () => {
    it('should return task with relations', async () => {
      const task = makeTask();
      taskRepository.findOne.mockResolvedValue(task);

      const result = await service.getTask('task-id');

      expect(result).toEqual(task);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-id' },
        relations: ['batch', 'project', 'workflow', 'assignments', 'annotations'],
      });
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.getTask('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getTaskAssignments ───────────────────────────────────────────────────────
  describe('getTaskAssignments', () => {
    it('should return assignments for a task', async () => {
      const task = makeTask();
      const assignments = [makeAssignment(), makeAssignment({ id: 'assignment-id-2' })];
      taskRepository.findOne.mockResolvedValue(task);
      assignmentRepository.find.mockResolvedValue(assignments);

      const result = await service.getTaskAssignments('task-id');

      expect(result).toEqual(assignments);
      expect(assignmentRepository.find).toHaveBeenCalledWith({
        where: { taskId: 'task-id' },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.getTaskAssignments('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listTasks ───────────────────────────────────────────────────────────────
  describe('listTasks', () => {
    function setupQb(tasks: Task[], total: number) {
      const qb = createMockQueryBuilder({
        getManyAndCount: jest.fn().mockResolvedValue([tasks, total]),
      });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);
      return qb;
    }

    it('should return paginated tasks with defaults', async () => {
      const tasks = [makeTask()];
      setupQb(tasks, 1);

      const result = await service.listTasks({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.total).toBe(1);
      expect(result.tasks).toHaveLength(1);
    });

    it('should apply batchId filter', async () => {
      const qb = setupQb([], 0);
      const filter: TaskFilterDto = { batchId: 'batch-id' };

      await service.listTasks(filter);

      expect(qb.andWhere).toHaveBeenCalledWith('task.batchId = :batchId', { batchId: 'batch-id' });
    });

    it('should apply projectId filter', async () => {
      const qb = setupQb([], 0);

      await service.listTasks({ projectId: 'project-id' });

      expect(qb.andWhere).toHaveBeenCalledWith('task.projectId = :projectId', { projectId: 'project-id' });
    });

    it('should apply status filter', async () => {
      const qb = setupQb([], 0);

      await service.listTasks({ status: 'queued' });

      expect(qb.andWhere).toHaveBeenCalledWith('task.status = :status', { status: TaskStatus.QUEUED });
    });

    it('should apply priority filter', async () => {
      const qb = setupQb([], 0);

      await service.listTasks({ priority: 7 });

      expect(qb.andWhere).toHaveBeenCalledWith('task.priority = :priority', { priority: 7 });
    });

    it('should apply taskType filter', async () => {
      const qb = setupQb([], 0);

      await service.listTasks({ taskType: 'annotation' });

      expect(qb.andWhere).toHaveBeenCalledWith('task.taskType = :taskType', { taskType: TaskType.ANNOTATION });
    });

    it('should apply assignedTo filter', async () => {
      const qb = setupQb([], 0);

      await service.listTasks({ assignedTo: 'user-id' });

      expect(qb.andWhere).toHaveBeenCalledWith('assignment.userId = :userId', { userId: 'user-id' });
      expect(qb.andWhere).toHaveBeenCalledWith('assignment.status IN (:...statuses)', {
        statuses: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
      });
    });

    it('should apply custom sortBy and sortOrder', async () => {
      const qb = setupQb([], 0);

      await service.listTasks({ sortBy: 'priority', sortOrder: 'ASC' });

      expect(qb.orderBy).toHaveBeenCalledWith('task.priority', 'ASC');
    });

    it('should apply custom page and pageSize', async () => {
      const qb = setupQb([], 0);

      await service.listTasks({ page: 3, pageSize: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect((await service.listTasks({ page: 3, pageSize: 10 })).page).toBe(3);
    });

    it('should compute assignedTo from active assignment', async () => {
      const activeAssignment = makeAssignment({ userId: 'active-user', status: AssignmentStatus.IN_PROGRESS });
      const task = makeTask({ assignments: [activeAssignment] });
      setupQb([task], 1);

      const result = await service.listTasks({});

      expect((result.tasks[0] as any).assignedTo).toBe('active-user');
      expect((result.tasks[0] as any).workflowStage).toBe(WorkflowStage.ANNOTATION);
    });

    it('should set assignedTo null when no active assignment', async () => {
      const completedAssignment = makeAssignment({ status: AssignmentStatus.COMPLETED });
      const task = makeTask({ assignments: [completedAssignment] });
      setupQb([task], 1);

      const result = await service.listTasks({});

      expect((result.tasks[0] as any).assignedTo).toBeNull();
    });

    it('should use externalId as fileName fallback when fileMetadata has no fileName', async () => {
      const task = makeTask({ fileMetadata: null, externalId: 'ext-001' });
      setupQb([task], 1);

      const result = await service.listTasks({});

      expect((result.tasks[0] as any).fileName).toBe('ext-001');
    });

    it('should use "Unknown" as fileName when no fileMetadata or externalId', async () => {
      const task = makeTask({ fileMetadata: null, externalId: null });
      setupQb([task], 1);

      const result = await service.listTasks({});

      expect((result.tasks[0] as any).fileName).toBe('Unknown');
    });

    it('should default sortOrder to DESC for non-ASC input', async () => {
      const qb = setupQb([], 0);

      await service.listTasks({ sortOrder: 'DESC' });

      expect(qb.orderBy).toHaveBeenCalledWith('task.createdAt', 'DESC');
    });
  });

  // ─── updateTask ───────────────────────────────────────────────────────────────
  describe('updateTask', () => {
    it('should update and return the task', async () => {
      const task = makeTask();
      const updated = makeTask({ status: TaskStatus.IN_PROGRESS, priority: 8 });
      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.save.mockResolvedValue(updated);

      const dto: UpdateTaskDto = {
        status: 'IN_PROGRESS',
        priority: 8,
        dueDate: new Date('2025-12-31'),
        dataPayload: { extra: 'data' },
        estimatedDuration: 200,
        actualDuration: 150,
      };
      const result = await service.updateTask('task-id', dto);

      expect(result).toEqual(updated);
      expect(kafkaService.publishTaskEvent).toHaveBeenCalledWith('updated', updated);
    });

    it('should update only provided fields (sparse update)', async () => {
      const task = makeTask();
      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.save.mockResolvedValue(task);

      await service.updateTask('task-id', { priority: 9 });

      expect(taskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 9 }),
      );
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.updateTask('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteTask ───────────────────────────────────────────────────────────────
  describe('deleteTask', () => {
    it('should soft-delete task and decrement batch totalTasks', async () => {
      const task = makeTask();
      const batch = makeBatch({ totalTasks: 5 });
      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.softDelete.mockResolvedValue(undefined as any);
      batchRepository.findOne.mockResolvedValue(batch);
      batchRepository.save.mockResolvedValue(batch);

      await service.deleteTask('task-id');

      expect(taskRepository.softDelete).toHaveBeenCalledWith('task-id');
      expect(batchRepository.save).toHaveBeenCalledWith(expect.objectContaining({ totalTasks: 4 }));
    });

    it('should skip batch update when batch not found', async () => {
      const task = makeTask();
      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.softDelete.mockResolvedValue(undefined as any);
      batchRepository.findOne.mockResolvedValue(null);

      await service.deleteTask('task-id');

      expect(batchRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteTask('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── assignTask ───────────────────────────────────────────────────────────────
  describe('assignTask', () => {
    const dto: AssignTaskDto = {
      taskId: 'task-id',
      userId: 'user-id',
      workflowStage: 'ANNOTATION',
      assignmentMethod: 'MANUAL',
      expiresIn: 7200,
    };

    function setupAssignTask(existing: Assignment | null = null, assignmentCount = 0) {
      const task = makeTask();
      const savedAssignment = makeAssignment();

      taskRepository.findOne.mockResolvedValue(task);
      assignmentRepository.findOne
        .mockResolvedValueOnce(existing) // duplicate check
        .mockResolvedValueOnce(savedAssignment); // fetch after insert
      assignmentRepository.count.mockResolvedValue(assignmentCount);
      assignmentRepository.create.mockReturnValue(savedAssignment);

      const insertQb = createMockQueryBuilder({
        execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 'new-assignment-id' }] }),
      });
      assignmentRepository.createQueryBuilder.mockReturnValue(insertQb as any);
      taskRepository.save.mockResolvedValue(task);

      return { task, savedAssignment };
    }

    it('should create and return assignment', async () => {
      const { savedAssignment } = setupAssignTask();

      const result = await service.assignTask(dto);

      expect(result).toEqual(savedAssignment);
      expect(kafkaService.publishTaskEvent).toHaveBeenCalledWith('assigned', expect.any(Object));
      expect(kafkaService.publishNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-id', type: 'TASK_ASSIGNED' }),
      );
    });

    it('should set isPrimary=true for first assignment', async () => {
      setupAssignTask(null, 0);

      await service.assignTask(dto);

      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isPrimary: true, assignmentOrder: 1 }),
      );
    });

    it('should set isPrimary=false for subsequent assignments', async () => {
      setupAssignTask(null, 2);

      await service.assignTask(dto);

      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isPrimary: false, assignmentOrder: 3 }),
      );
    });

    it('should default workflowStage to ANNOTATION when not provided', async () => {
      setupAssignTask();

      await service.assignTask({ taskId: 'task-id', userId: 'user-id' });

      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ workflowStage: WorkflowStage.ANNOTATION }),
      );
    });

    it('should default assignmentMethod to MANUAL when not provided', async () => {
      setupAssignTask();

      await service.assignTask({ taskId: 'task-id', userId: 'user-id' });

      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ assignmentMethod: AssignmentMethod.MANUAL }),
      );
    });

    it('should use provided expiresIn for expiry calculation', async () => {
      setupAssignTask();

      await service.assignTask({ taskId: 'task-id', userId: 'user-id', expiresIn: 3600 });

      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: expect.any(Date) }),
      );
    });

    it('should throw BadRequestException when taskId is missing', async () => {
      await expect(service.assignTask({ taskId: '', userId: 'user-id' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when userId is missing', async () => {
      await expect(service.assignTask({ taskId: 'task-id', userId: '' })).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.assignTask(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when task already assigned to user', async () => {
      taskRepository.findOne.mockResolvedValue(makeTask());
      assignmentRepository.findOne.mockResolvedValueOnce(makeAssignment()); // existing

      await expect(service.assignTask(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw Error when saved assignment not found after insert', async () => {
      const task = makeTask();
      taskRepository.findOne.mockResolvedValue(task);
      assignmentRepository.findOne
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce(null); // not found after insert
      assignmentRepository.count.mockResolvedValue(0);
      assignmentRepository.create.mockReturnValue(makeAssignment());

      const insertQb = createMockQueryBuilder({
        execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 'new-id' }] }),
      });
      assignmentRepository.createQueryBuilder.mockReturnValue(insertQb as any);

      await expect(service.assignTask(dto)).rejects.toThrow('Failed to create assignment');
    });

    it('should throw NotFoundException when task not found after insert', async () => {
      const task = makeTask();
      const savedAssignment = makeAssignment();
      taskRepository.findOne
        .mockResolvedValueOnce(task)   // getTask
        .mockResolvedValueOnce(null);  // findOne for taskToUpdate
      assignmentRepository.findOne
        .mockResolvedValueOnce(null)    // no duplicate
        .mockResolvedValueOnce(savedAssignment); // found after insert
      assignmentRepository.count.mockResolvedValue(0);
      assignmentRepository.create.mockReturnValue(savedAssignment);

      const insertQb = createMockQueryBuilder({
        execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 'new-id' }] }),
      });
      assignmentRepository.createQueryBuilder.mockReturnValue(insertQb as any);

      await expect(service.assignTask(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getNextTask ─────────────────────────────────────────────────────────────
  describe('getNextTask', () => {
    it('should return null when no task is available', async () => {
      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getNextTask({ userId: 'user-id' });

      expect(result).toBeNull();
    });

    it('should assign and return next task when available', async () => {
      const foundTask = makeTask();
      const assignedTask = makeTask({ status: TaskStatus.ASSIGNED });
      const savedAssignment = makeAssignment();

      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(foundTask) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      // Mock the assignTask internals
      taskRepository.findOne
        .mockResolvedValueOnce(foundTask) // getTask in assignTask
        .mockResolvedValueOnce(foundTask) // findOne taskToUpdate in assignTask
        .mockResolvedValueOnce(assignedTask); // getTask final result
      assignmentRepository.findOne
        .mockResolvedValueOnce(null)          // no duplicate
        .mockResolvedValueOnce(savedAssignment); // found after insert
      assignmentRepository.count.mockResolvedValue(0);
      assignmentRepository.create.mockReturnValue(savedAssignment);

      const insertQb = createMockQueryBuilder({
        execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 'new-id' }] }),
      });
      assignmentRepository.createQueryBuilder.mockReturnValue(insertQb as any);
      taskRepository.save.mockResolvedValue(foundTask);

      const result = await service.getNextTask({ userId: 'user-id' });

      expect(result).toEqual(assignedTask);
    });

    it('should apply projectId filter when provided', async () => {
      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getNextTask({ userId: 'user-id', projectId: 'project-id' });

      expect(qb.andWhere).toHaveBeenCalledWith('task.projectId = :projectId', { projectId: 'project-id' });
    });

    it('should apply taskType filter when provided', async () => {
      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getNextTask({ userId: 'user-id', taskType: 'ANNOTATION' });

      expect(qb.andWhere).toHaveBeenCalledWith('task.taskType = :taskType', { taskType: 'ANNOTATION' });
    });

    it('should apply queue priority filter when queue has priority config', async () => {
      const queue = { id: 'queue-id', configuration: { filters: { priority: 5 } } } as any;
      queueRepository.findOne.mockResolvedValue(queue);

      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getNextTask({ userId: 'user-id', queueId: 'queue-id' });

      expect(qb.andWhere).toHaveBeenCalledWith('task.priority >= :minPriority', { minPriority: 5 });
    });

    it('should skip queue filter when queue not found', async () => {
      queueRepository.findOne.mockResolvedValue(null);

      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getNextTask({ userId: 'user-id', queueId: 'missing-queue' });

      expect(result).toBeNull();
    });

    it('should skip queue priority filter when queue has no priority config', async () => {
      const queue = { id: 'queue-id', configuration: { filters: {} } } as any;
      queueRepository.findOne.mockResolvedValue(queue);

      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getNextTask({ userId: 'user-id', queueId: 'queue-id' });

      // andWhere for minPriority should NOT be called
      const andWhereCalls = (qb.andWhere as jest.Mock).mock.calls.map(c => c[0]);
      expect(andWhereCalls).not.toContain('task.priority >= :minPriority');
    });
  });

  // ─── submitTask ───────────────────────────────────────────────────────────────
  describe('submitTask', () => {
    const dto: SubmitTaskDto = {
      taskId: 'task-id',
      assignmentId: 'assignment-id',
      annotationData: { label: 'positive' },
      confidenceScore: 0.9,
      timeSpent: 120,
      responses: [
        { questionId: 'q1', response: 'yes', timeSpent: 60, confidenceScore: 0.95 },
      ],
    };

    function setupSubmitTask(task: Task, assignment: Assignment) {
      taskRepository.findOne.mockResolvedValue(task);
      assignmentRepository.findOne.mockResolvedValue(assignment);
      const annotation = { id: 'annotation-id', taskId: 'task-id', userId: 'user-id' } as any;
      annotationRepository.create.mockReturnValue(annotation);
      annotationRepository.save.mockResolvedValue(annotation);
      responseRepository.create.mockReturnValue({} as any);
      responseRepository.save.mockResolvedValue([] as any);
      assignmentRepository.save.mockResolvedValue(assignment);
      taskRepository.save.mockResolvedValue(task);
    }

    it('should submit task and create annotation with responses', async () => {
      const task = makeTask({ completedAssignments: 0, totalAssignmentsRequired: 2 });
      const assignment = makeAssignment();
      setupSubmitTask(task, assignment);

      const result = await service.submitTask(dto);

      expect(annotationRepository.save).toHaveBeenCalled();
      expect(responseRepository.save).toHaveBeenCalled();
      expect(assignment.status).toBe(AssignmentStatus.COMPLETED);
      expect(kafkaService.publishTaskEvent).toHaveBeenCalledWith('submitted', expect.any(Object));
      expect(kafkaService.publishAnnotationEvent).toHaveBeenCalled();
      expect(kafkaService.publishQualityCheckRequest).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should submit without responses when responses array is empty', async () => {
      const task = makeTask();
      const assignment = makeAssignment();
      setupSubmitTask(task, assignment);

      await service.submitTask({ ...dto, responses: [] });

      expect(responseRepository.save).not.toHaveBeenCalled();
    });

    it('should submit without responses when responses is undefined', async () => {
      const task = makeTask();
      const assignment = makeAssignment();
      setupSubmitTask(task, assignment);

      await service.submitTask({ ...dto, responses: undefined });

      expect(responseRepository.save).not.toHaveBeenCalled();
    });

    it('should mark consensusReached=true when no consensus required and all assignments complete', async () => {
      const task = makeTask({ completedAssignments: 0, totalAssignmentsRequired: 1, requiresConsensus: false });
      const assignment = makeAssignment();
      setupSubmitTask(task, assignment);

      await service.submitTask(dto);

      expect(taskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ consensusReached: true }),
      );
    });

    it('should calculate consensus when required and all assignments complete', async () => {
      const task = makeTask({
        completedAssignments: 0,
        totalAssignmentsRequired: 1,
        requiresConsensus: true,
      });
      const assignment = makeAssignment();
      setupSubmitTask(task, assignment);

      // Mock calculateConsensus internals
      annotationRepository.find.mockResolvedValue([
        { id: 'ann-1', confidenceScore: 0.9, timeSpent: 100 } as any,
        { id: 'ann-2', confidenceScore: 0.8, timeSpent: 80 } as any,
      ]);
      responseRepository.find.mockResolvedValue([
        { questionId: 'q1', response: 'yes' } as any,
        { questionId: 'q1', response: 'yes' } as any,
      ]);

      await service.submitTask(dto);

      expect(taskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ consensusScore: 100, consensusReached: true }),
      );
    });

    it('should calculate partial consensus when responses differ', async () => {
      const task = makeTask({
        completedAssignments: 0,
        totalAssignmentsRequired: 1,
        requiresConsensus: true,
      });
      const assignment = makeAssignment();
      setupSubmitTask(task, assignment);

      annotationRepository.find.mockResolvedValue([
        { id: 'ann-1' } as any,
        { id: 'ann-2' } as any,
      ]);
      responseRepository.find.mockResolvedValue([
        { questionId: 'q1', response: 'yes' } as any,
        { questionId: 'q1', response: 'no' } as any,
      ]);

      await service.submitTask(dto);

      expect(taskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ consensusScore: 50, consensusReached: false }),
      );
    });

    it('should handle single annotation as 100% consensus', async () => {
      const task = makeTask({
        completedAssignments: 0,
        totalAssignmentsRequired: 1,
        requiresConsensus: true,
      });
      const assignment = makeAssignment();
      setupSubmitTask(task, assignment);

      // Only one annotation
      annotationRepository.find.mockResolvedValue([{ id: 'ann-1' } as any]);
      responseRepository.find.mockResolvedValue([]);

      await service.submitTask(dto);

      expect(taskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ consensusScore: 100, consensusReached: true }),
      );
    });

    it('should handle question with only one response as 100% consensus', async () => {
      const task = makeTask({
        completedAssignments: 0,
        totalAssignmentsRequired: 1,
        requiresConsensus: true,
      });
      const assignment = makeAssignment();
      setupSubmitTask(task, assignment);

      annotationRepository.find.mockResolvedValue([
        { id: 'ann-1' } as any,
        { id: 'ann-2' } as any,
      ]);
      // Each question has only one response (different question IDs)
      responseRepository.find.mockResolvedValue([
        { questionId: 'q1', response: 'yes' } as any,
      ]);

      await service.submitTask(dto);

      expect(taskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ consensusScore: 100 }),
      );
    });

    it('should throw NotFoundException when assignment not found', async () => {
      taskRepository.findOne.mockResolvedValue(makeTask());
      assignmentRepository.findOne.mockResolvedValue(null);

      await expect(service.submitTask(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateTaskStatus ─────────────────────────────────────────────────────────
  describe('updateTaskStatus', () => {
    it('should update task status and publish event', async () => {
      const task = makeTask();
      const updated = makeTask({ status: TaskStatus.IN_REVIEW });
      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.save.mockResolvedValue(updated);

      const dto: UpdateTaskStatusDto = { status: 'IN_REVIEW', reason: 'review started' };
      const result = await service.updateTaskStatus('task-id', dto);

      expect(result).toEqual(updated);
      expect(kafkaService.publishTaskEvent).toHaveBeenCalledWith(
        'state_changed',
        expect.objectContaining({ reason: 'review started' }),
      );
    });

    it('should increment completedTasks when status is APPROVED', async () => {
      const task = makeTask();
      const batch = makeBatch({ completedTasks: 3 });
      taskRepository.findOne.mockResolvedValue(task);
      batchRepository.findOne.mockResolvedValue(batch);
      batchRepository.save.mockResolvedValue(batch);
      taskRepository.save.mockResolvedValue(task);

      await service.updateTaskStatus('task-id', { status: 'APPROVED' });

      expect(batchRepository.save).toHaveBeenCalledWith(expect.objectContaining({ completedTasks: 4 }));
      expect(task.allReviewsApproved).toBe(true);
    });

    it('should skip batch update when batch not found on APPROVED', async () => {
      const task = makeTask();
      taskRepository.findOne.mockResolvedValue(task);
      batchRepository.findOne.mockResolvedValue(null);
      taskRepository.save.mockResolvedValue(task);

      await service.updateTaskStatus('task-id', { status: 'APPROVED' });

      expect(batchRepository.save).not.toHaveBeenCalled();
    });

    it('should store skip metadata when status is SKIPPED and metadata provided', async () => {
      const task = makeTask({ dataPayload: { sourceData: {}, context: { existing: 'data' } } });
      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.save.mockResolvedValue(task);

      await service.updateTaskStatus('task-id', {
        status: 'SKIPPED',
        reason: 'irrelevant content',
        metadata: { userComment: 'not applicable' },
      });

      expect(taskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          dataPayload: expect.objectContaining({
            context: expect.objectContaining({
              skipReason: 'irrelevant content',
              skipMetadata: { userComment: 'not applicable' },
            }),
          }),
        }),
      );
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.updateTaskStatus('nonexistent', { status: 'QUEUED' })).rejects.toThrow(NotFoundException);
    });
  });

  // ─── bulkAction ───────────────────────────────────────────────────────────────
  describe('bulkAction', () => {
    const taskIds = ['task-1', 'task-2'];

    beforeEach(() => {
      // Default mocks for sub-operations used in updateTaskStatus and assignTask
      taskRepository.findOne.mockResolvedValue(makeTask());
      taskRepository.save.mockResolvedValue(makeTask());
      batchRepository.findOne.mockResolvedValue(null);
    });

    it('ASSIGN action: assigns tasks to userId', async () => {
      const assignment = makeAssignment();
      assignmentRepository.findOne.mockResolvedValue(null).mockResolvedValueOnce(null);
      assignmentRepository.findOne
        .mockResolvedValueOnce(null)   // no duplicate task-1
        .mockResolvedValueOnce(assignment) // found after insert task-1
        .mockResolvedValueOnce(null)   // no duplicate task-2
        .mockResolvedValueOnce(assignment); // found after insert task-2
      assignmentRepository.count.mockResolvedValue(0);
      assignmentRepository.create.mockReturnValue(assignment);
      const insertQb = createMockQueryBuilder({
        execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 'new-id' }] }),
      });
      assignmentRepository.createQueryBuilder.mockReturnValue(insertQb as any);

      const dto: BulkTaskActionDto = { taskIds, action: 'ASSIGN', userId: 'user-id' };
      const result = await service.bulkAction(dto);

      expect(result.success).toEqual(taskIds);
      expect(result.failed).toHaveLength(0);
    });

    it('ASSIGN action: fails when userId not provided', async () => {
      const dto: BulkTaskActionDto = { taskIds: ['task-1'], action: 'ASSIGN' };
      const result = await service.bulkAction(dto);

      expect(result.failed).toContain('task-1');
    });

    it('SKIP action: updates status to SKIPPED', async () => {
      const dto: BulkTaskActionDto = { taskIds: ['task-1'], action: 'SKIP', reason: 'skip reason' };
      const result = await service.bulkAction(dto);

      expect(result.success).toContain('task-1');
    });

    it('RESET action: updates status to QUEUED', async () => {
      const dto: BulkTaskActionDto = { taskIds: ['task-1'], action: 'RESET' };
      const result = await service.bulkAction(dto);

      expect(result.success).toContain('task-1');
    });

    it('ARCHIVE action: soft-deletes tasks', async () => {
      const task = makeTask();
      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.softDelete.mockResolvedValue(undefined as any);

      const dto: BulkTaskActionDto = { taskIds: ['task-1'], action: 'ARCHIVE' };
      const result = await service.bulkAction(dto);

      expect(result.success).toContain('task-1');
      expect(taskRepository.softDelete).toHaveBeenCalled();
    });

    it('HOLD action: updates status to QUEUED with HOLD reason', async () => {
      const dto: BulkTaskActionDto = { taskIds: ['task-1'], action: 'HOLD', reason: 'hold reason' };
      const result = await service.bulkAction(dto);

      expect(result.success).toContain('task-1');
    });

    it('PRIORITY_CHANGE action: updates task priority', async () => {
      const dto: BulkTaskActionDto = { taskIds: ['task-1'], action: 'PRIORITY_CHANGE', priority: 9 };
      const result = await service.bulkAction(dto);

      expect(result.success).toContain('task-1');
    });

    it('PRIORITY_CHANGE action: fails when priority not provided', async () => {
      const dto: BulkTaskActionDto = { taskIds: ['task-1'], action: 'PRIORITY_CHANGE' };
      const result = await service.bulkAction(dto);

      expect(result.failed).toContain('task-1');
    });

    it('should collect failed task IDs on error', async () => {
      taskRepository.findOne.mockResolvedValue(null); // causes NotFoundException

      const dto: BulkTaskActionDto = { taskIds: ['bad-task'], action: 'SKIP' };
      const result = await service.bulkAction(dto);

      expect(result.failed).toContain('bad-task');
    });
  });

  // ─── getTaskStatistics ────────────────────────────────────────────────────────
  describe('getTaskStatistics', () => {
    it('should return statistics with averages', async () => {
      const task = makeTask({ completedAssignments: 2, consensusScore: 0.85, consensusReached: true, currentReviewLevel: 1 });
      const annotations = [
        { id: 'ann-1', confidenceScore: 0.9, timeSpent: 120 } as any,
        { id: 'ann-2', confidenceScore: 0.8, timeSpent: 90 } as any,
      ];
      const responses = [{ id: 'resp-1' } as any];
      const reviewApprovals = {
        reviewApprovals: [
          { status: 'APPROVED' },
          { status: 'APPROVED' },
          { status: 'REJECTED' },
        ],
      };

      taskRepository.findOne.mockResolvedValue(task);
      annotationRepository.find.mockResolvedValue(annotations);
      responseRepository.find.mockResolvedValue(responses);

      const reviewQb = createMockQueryBuilder({
        getOne: jest.fn().mockResolvedValue(reviewApprovals),
      });
      taskRepository.createQueryBuilder.mockReturnValue(reviewQb as any);

      const result = await service.getTaskStatistics('task-id');

      expect(result.totalAnnotations).toBe(2);
      expect(result.averageConfidenceScore).toBeCloseTo(0.85);
      expect(result.averageTimeSpent).toBeCloseTo(105);
      expect(result.reviewsApproved).toBe(2);
      expect(result.reviewsRejected).toBe(1);
      expect(result.responses).toBe(1);
    });

    it('should return zero averages when no annotations', async () => {
      const task = makeTask();
      taskRepository.findOne.mockResolvedValue(task);
      annotationRepository.find.mockResolvedValue([]);
      responseRepository.find.mockResolvedValue([]);
      taskRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) }) as any,
      );

      const result = await service.getTaskStatistics('task-id');

      expect(result.averageConfidenceScore).toBe(0);
      expect(result.averageTimeSpent).toBe(0);
      expect(result.reviewsApproved).toBe(0);
      expect(result.reviewsRejected).toBe(0);
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.getTaskStatistics('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getTaskRenderConfig ──────────────────────────────────────────────────────
  describe('getTaskRenderConfig', () => {
    it('should delegate to TaskRenderingService', async () => {
      const config = { questions: [], fileViewer: {} };
      taskRenderingService.getTaskRenderConfig.mockResolvedValue(config);

      const result = await service.getTaskRenderConfig('task-id', 'user-id');

      expect(result).toEqual(config);
      expect(taskRenderingService.getTaskRenderConfig).toHaveBeenCalledWith('task-id', 'user-id');
    });
  });

  // ─── saveAnnotation ───────────────────────────────────────────────────────────
  describe('saveAnnotation', () => {
    it('should save annotation and publish Kafka event', async () => {
      const renderResult = {
        annotationId: 'ann-id',
        version: 1,
        responsesCount: 3,
      };
      taskRenderingService.saveAnnotationResponse.mockResolvedValue(renderResult as any);

      const dto = {
        responses: [{ questionId: 'q1', response: 'yes' }],
        extraWidgetData: { widget: 'data' },
        timeSpent: 90,
      };

      await service.saveAnnotation('task-id', 'user-id', dto);

      expect(taskRenderingService.saveAnnotationResponse).toHaveBeenCalledWith(
        'task-id', 'user-id', dto.responses, dto.extraWidgetData, dto.timeSpent,
      );
      expect(kafkaService.publishAnnotationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ann-id',
          taskId: 'task-id',
          userId: 'user-id',
          version: 1,
          responsesCount: 3,
        }),
      );
    });
  });

  // ─── saveReview ───────────────────────────────────────────────────────────────
  describe('saveReview', () => {
    it('should delegate to TaskRenderingService', async () => {
      taskRenderingService.saveReviewDecision.mockResolvedValue(undefined);

      const dto = {
        decision: 'APPROVED' as const,
        comments: 'Good work',
        qualityScore: 0.95,
        extraWidgetData: null,
        timeSpent: 60,
      };

      await service.saveReview('task-id', 'user-id', dto);

      expect(taskRenderingService.saveReviewDecision).toHaveBeenCalledWith(
        'task-id', 'user-id', dto.decision, dto.comments, dto.qualityScore, dto.extraWidgetData, dto.timeSpent,
      );
    });
  });

  // ─── getAnnotationHistory ─────────────────────────────────────────────────────
  describe('getAnnotationHistory', () => {
    it('should delegate to TaskRenderingService', async () => {
      const history = [{ version: 1 }, { version: 2 }];
      taskRenderingService.getTaskAnnotationHistory.mockResolvedValue(history);

      const result = await service.getAnnotationHistory('task-id');

      expect(result).toEqual(history);
      expect(taskRenderingService.getTaskAnnotationHistory).toHaveBeenCalledWith('task-id');
    });
  });

  // ─── getTimeAnalytics ─────────────────────────────────────────────────────────
  describe('getTimeAnalytics', () => {
    const baseAnnotation = (taskId: string, userId: string, timeSpent: number, createdAt: Date) =>
      ({ id: `ann-${userId}`, taskId, userId, timeSpent, createdAt }) as any;

    const baseTask = (id: string, projectId: string, batchId: string, actualDuration: number, estimatedDuration: number, dataPayload: any, createdAt: Date) =>
      ({ id, projectId, batchId, actualDuration, estimatedDuration, dataPayload, status: TaskStatus.SUBMITTED, createdAt }) as any;

    it('should return analytics for all data when no filters applied', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([
        baseAnnotation('t1', 'user-1', 120, now),
        baseAnnotation('t2', 'user-1', 80, now),
        baseAnnotation('t3', 'user-2', 200, now),
      ]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', 100, 120, {}, now),
        baseTask('t2', 'p1', 'b1', 80, 90, {}, now),
        baseTask('t3', 'p2', 'b2', 200, 180, {}, now),
      ]);

      const result = await service.getTimeAnalytics({});

      expect(result.annotatorMetrics).toHaveLength(2);
      expect(result.summary.totalAnnotationTimeSeconds).toBe(400);
      expect(result.summary.totalAnnotators).toBe(2);
      expect(result.summary.totalReviewers).toBe(0);
    });

    it('should filter annotations by projectId', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([
        baseAnnotation('t1', 'user-1', 120, now),
        baseAnnotation('t2', 'user-1', 80, now),
      ]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', 100, 120, {}, now),
        baseTask('t2', 'p2', 'b2', 80, 90, {}, now), // different project
      ]);

      const result = await service.getTimeAnalytics({ projectId: 'p1' });

      expect(result.annotatorMetrics[0].totalTimeSeconds).toBe(120);
    });

    it('should filter annotations by batchId', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([
        baseAnnotation('t1', 'user-1', 120, now),
        baseAnnotation('t2', 'user-1', 80, now),
      ]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', 100, 120, {}, now),
        baseTask('t2', 'p1', 'b2', 80, 90, {}, now),
      ]);

      const result = await service.getTimeAnalytics({ batchId: 'b1' });

      expect(result.annotatorMetrics[0].totalTimeSeconds).toBe(120);
    });

    it('should filter annotations by date range', async () => {
      annotationRepository.find.mockResolvedValue([
        baseAnnotation('t1', 'user-1', 120, new Date('2025-03-01')),
        baseAnnotation('t2', 'user-1', 80, new Date('2025-07-01')),
      ]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', 100, 120, {}, new Date('2025-03-01')),
        baseTask('t2', 'p1', 'b1', 80, 90, {}, new Date('2025-07-01')),
      ]);

      const result = await service.getTimeAnalytics({
        startDate: '2025-01-01',
        endDate: '2025-06-01',
      });

      expect(result.annotatorMetrics[0].totalTimeSeconds).toBe(120);
    });

    it('should filter by userId', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([
        baseAnnotation('t1', 'user-1', 120, now),
      ]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', 100, 120, {}, now),
      ]);

      const result = await service.getTimeAnalytics({ userId: 'user-1' });

      expect(annotationRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result.annotatorMetrics).toHaveLength(1);
    });

    it('should skip annotations without timeSpent', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([
        baseAnnotation('t1', 'user-1', null, now), // no timeSpent
        baseAnnotation('t2', 'user-1', 80, now),
      ]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', null, null, {}, now),
        baseTask('t2', 'p1', 'b1', 80, 90, {}, now),
      ]);

      const result = await service.getTimeAnalytics({});

      expect(result.annotatorMetrics[0].totalTimeSeconds).toBe(80);
    });

    it('should skip annotations for tasks not in taskMap', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([
        baseAnnotation('unknown-task', 'user-1', 120, now),
      ]);
      taskRepository.find.mockResolvedValue([]);

      const result = await service.getTimeAnalytics({});

      expect(result.annotatorMetrics).toHaveLength(0);
    });

    it('should include reviewer metrics from task dataPayload', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', 100, 120, {
          context: { lastReview: { reviewerId: 'reviewer-1', timeSpent: 300 } },
        }, now),
      ]);

      const result = await service.getTimeAnalytics({});

      expect(result.reviewerMetrics).toHaveLength(1);
      expect(result.reviewerMetrics[0].userId).toBe('reviewer-1');
      expect(result.reviewerMetrics[0].totalTimeSeconds).toBe(300);
    });

    it('should filter reviewer metrics by userId', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', 100, 120, {
          context: { lastReview: { reviewerId: 'reviewer-1', timeSpent: 300 } },
        }, now),
        baseTask('t2', 'p1', 'b1', 100, 120, {
          context: { lastReview: { reviewerId: 'reviewer-2', timeSpent: 200 } },
        }, now),
      ]);

      const result = await service.getTimeAnalytics({ userId: 'reviewer-1' });

      expect(result.reviewerMetrics).toHaveLength(1);
      expect(result.reviewerMetrics[0].userId).toBe('reviewer-1');
    });

    it('should skip reviewer when lastReview has no reviewerId or timeSpent', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', 100, 120, { context: { lastReview: {} } }, now),
        baseTask('t2', 'p1', 'b1', 100, 120, { context: {} }, now),
      ]);

      const result = await service.getTimeAnalytics({});

      expect(result.reviewerMetrics).toHaveLength(0);
    });

    it('should cap taskMetrics at 100 items', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([]);
      const tasks = Array.from({ length: 150 }, (_, i) =>
        baseTask(`t${i}`, 'p1', 'b1', 100, 120, {}, now),
      );
      taskRepository.find.mockResolvedValue(tasks);

      const result = await service.getTimeAnalytics({});

      expect(result.taskMetrics).toHaveLength(100);
    });

    it('should compute efficiency ratio correctly', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', 100, 200, {}, now), // 200% efficiency
      ]);

      const result = await service.getTimeAnalytics({});

      expect(result.taskMetrics[0].efficiency).toBe(200);
    });

    it('should set efficiency null when missing actual or estimated duration', async () => {
      const now = new Date('2025-06-01');
      annotationRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([
        baseTask('t1', 'p1', 'b1', null, 120, {}, now), // no actualDuration
      ]);

      const result = await service.getTimeAnalytics({});

      expect(result.taskMetrics[0].efficiency).toBeNull();
    });
  });

  // ─── reassignTask ─────────────────────────────────────────────────────────────
  describe('reassignTask', () => {
    it('should reassign task and release active assignments', async () => {
      const task = makeTask();
      const newUser = { id: 'new-user-id' } as any;
      const activeAssignment = makeAssignment({ status: AssignmentStatus.ASSIGNED });
      const newAssignment = makeAssignment({ id: 'new-assignment-id', userId: 'new-user-id' });

      taskRepository.findOne.mockResolvedValue(task);
      userRepository.findOne.mockResolvedValue(newUser);
      assignmentRepository.find.mockResolvedValue([activeAssignment]);
      assignmentRepository.save
        .mockResolvedValueOnce(activeAssignment) // release old
        .mockResolvedValueOnce(newAssignment);  // save new
      assignmentRepository.create.mockReturnValue(newAssignment);
      taskRepository.save.mockResolvedValue(task);

      const result = await service.reassignTask('task-id', 'new-user-id', 'workload balancing');

      expect(activeAssignment.status).toBe(AssignmentStatus.REASSIGNED);
      expect(result.assignment).toEqual(newAssignment);
      expect(kafkaService.publishTaskEvent).toHaveBeenCalledWith('assigned', task);
      expect(kafkaService.publishNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'new-user-id', type: 'TASK_ASSIGNED' }),
      );
    });

    it('should use provided workflowStage', async () => {
      const task = makeTask();
      const newUser = { id: 'new-user-id' } as any;
      const newAssignment = makeAssignment({ userId: 'new-user-id', workflowStage: WorkflowStage.REVIEW });

      taskRepository.findOne.mockResolvedValue(task);
      userRepository.findOne.mockResolvedValue(newUser);
      assignmentRepository.find.mockResolvedValue([]);
      assignmentRepository.create.mockReturnValue(newAssignment);
      assignmentRepository.save.mockResolvedValue(newAssignment);
      taskRepository.save.mockResolvedValue(task);

      await service.reassignTask('task-id', 'new-user-id', undefined, 'REVIEW');

      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ workflowStage: WorkflowStage.REVIEW }),
      );
    });

    it('should log warning but not throw when Kafka publish fails', async () => {
      const task = makeTask();
      taskRepository.findOne.mockResolvedValue(task);
      userRepository.findOne.mockResolvedValue({ id: 'new-user-id' } as any);
      assignmentRepository.find.mockResolvedValue([]);
      const newAssignment = makeAssignment({ userId: 'new-user-id' });
      assignmentRepository.create.mockReturnValue(newAssignment);
      assignmentRepository.save.mockResolvedValue(newAssignment);
      taskRepository.save.mockResolvedValue(task);
      kafkaService.publishTaskEvent.mockRejectedValue(new Error('Kafka down'));

      await expect(service.reassignTask('task-id', 'new-user-id')).resolves.toBeDefined();
    });

    it('should throw NotFoundException when new user not found', async () => {
      taskRepository.findOne.mockResolvedValue(makeTask());
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.reassignTask('task-id', 'nonexistent-user')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.reassignTask('nonexistent', 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── unassignTask ─────────────────────────────────────────────────────────────
  describe('unassignTask', () => {
    it('should unassign task and release all active assignments', async () => {
      const activeAssignment1 = makeAssignment({ status: AssignmentStatus.ASSIGNED });
      const activeAssignment2 = makeAssignment({ id: 'a2', status: AssignmentStatus.IN_PROGRESS });
      const task = makeTask({ assignments: [activeAssignment1, activeAssignment2] });
      const updatedTask = makeTask({ status: TaskStatus.QUEUED, assignmentId: null, assignedAt: null });

      taskRepository.findOne.mockResolvedValue(task);
      assignmentRepository.save.mockResolvedValue(activeAssignment1);
      taskRepository.save.mockResolvedValue(updatedTask);

      const result = await service.unassignTask('task-id');

      expect(activeAssignment1.status).toBe(AssignmentStatus.REASSIGNED);
      expect(activeAssignment2.status).toBe(AssignmentStatus.REASSIGNED);
      expect(assignmentRepository.save).toHaveBeenCalledTimes(2);
      expect(result).toEqual(updatedTask);
    });

    it('should return task unchanged when no active assignments', async () => {
      const completedAssignment = makeAssignment({ status: AssignmentStatus.COMPLETED });
      const task = makeTask({ assignments: [completedAssignment] });
      taskRepository.findOne.mockResolvedValue(task);

      const result = await service.unassignTask('task-id');

      expect(assignmentRepository.save).not.toHaveBeenCalled();
      expect(taskRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(task);
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.unassignTask('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── sendEvent (private — via reflection) ────────────────────────────────────
  describe('sendEvent (private)', () => {
    it('should update machineState context with event and publish to Kafka', async () => {
      const task = makeTask();
      const updatedTask = makeTask();
      taskRepository.findOne.mockResolvedValue(task);
      taskRepository.save.mockResolvedValue(updatedTask);

      const result = await (service as any).sendEvent('task-id', {
        event: 'SUBMIT',
        payload: { comment: 'done' },
      });

      expect(result).toEqual(updatedTask);
      expect(task.machineState.context).toMatchObject({ lastEvent: 'SUBMIT', lastEventPayload: { comment: 'done' } });
      expect(kafkaService.publishTaskEvent).toHaveBeenCalledWith('state_changed', expect.objectContaining({ event: 'SUBMIT' }));
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect((service as any).sendEvent('nonexistent', { event: 'SUBMIT' })).rejects.toThrow(NotFoundException);
    });
  });
});
