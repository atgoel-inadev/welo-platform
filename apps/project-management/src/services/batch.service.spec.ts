import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BatchService } from './batch.service';
import { Batch, Task, Assignment, Project, User, Workflow } from '@app/common/entities';
import { BatchStatus, AssignmentStatus, AssignmentMethod, WorkflowStage, TaskType, TaskStatus, UserRole, UserStatus } from '@app/common/enums';

describe('BatchService', () => {
  let service: BatchService;
  let batchRepository: Repository<Batch>;
  let taskRepository: Repository<Task>;
  let assignmentRepository: Repository<Assignment>;
  let projectRepository: Repository<Project>;
  let userRepository: Repository<User>;
  let workflowRepository: Repository<Workflow>;

  const mockBatch = {
    id: 'batch-123',
    name: 'Test Batch',
    projectId: 'project-123',
    status: BatchStatus.IN_PROGRESS,
    totalTasks: 10,
    completedTasks: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Batch;

  const mockTask = {
    id: 'task-123',
    batchId: 'batch-123',
    projectId: 'project-123',
    workflowId: 'workflow-123',
    externalId: 'ext-123',
    taskType: TaskType.ANNOTATION,
    status: TaskStatus.QUEUED,
    priority: 1,
    machineState: {
      value: 'queued',
      context: {},
      done: false,
      changed: false,
    },
    previousState: null,
    stateUpdatedAt: null,
    dataPayload: {
      sourceData: {},
      references: [],
      context: {},
    },
    assignmentId: null,
    attemptCount: 0,
    assignedAt: null,
    startedAt: null,
    submittedAt: null,
    completedAt: null,
    dueDate: null,
    estimatedDuration: null,
    actualDuration: null,
    fileType: 'TXT',
    fileUrl: 'https://example.com/file.txt',
    fileMetadata: null,
    requiresConsensus: false,
    consensusReached: false,
    consensusScore: null,
    currentReviewLevel: 0,
    maxReviewLevel: 0,
    allReviewsApproved: false,
    totalAssignmentsRequired: 1,
    completedAssignments: 0,
    annotationResponses: [],
    extraWidgetData: null,
    reviewData: [],
    batch: null,
    project: null,
    workflow: null,
    assignments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.ANNOTATOR,
    status: UserStatus.ACTIVE,
    skills: [],
    performanceMetrics: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    configuration: {
      workflowConfiguration: {
        stages: [
          {
            id: 'stage_annotation',
            name: 'Annotation',
            type: 'annotation',
            annotators_count: 1,
            auto_assign: true,
          },
        ],
      },
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchService,
        {
          provide: getRepositoryToken(Batch),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            execute: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Workflow),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BatchService>(BatchService);
    batchRepository = module.get<Repository<Batch>>(getRepositoryToken(Batch));
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    assignmentRepository = module.get<Repository<Assignment>>(getRepositoryToken(Assignment));
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    workflowRepository = module.get<Repository<Workflow>>(getRepositoryToken(Workflow));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listBatches', () => {
    it('should return all batches when no projectId provided', async () => {
      const mockBatches = [mockBatch];
      jest.spyOn(batchRepository, 'find').mockResolvedValue(mockBatches);

      const result = await service.listBatches();

      expect(result).toEqual(mockBatches);
      expect(batchRepository.find).toHaveBeenCalledWith({
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter batches by projectId', async () => {
      const mockBatches = [mockBatch];
      jest.spyOn(batchRepository, 'find').mockResolvedValue(mockBatches);

      const result = await service.listBatches('project-123');

      expect(result).toEqual(mockBatches);
      expect(batchRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getBatch', () => {
    it('should return batch when found', async () => {
      jest.spyOn(batchRepository, 'findOne').mockResolvedValue(mockBatch);

      const result = await service.getBatch('batch-123');

      expect(result).toEqual(mockBatch);
      expect(batchRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'batch-123' },
        relations: ['project', 'tasks'],
      });
    });

    it('should throw error when batch not found', async () => {
      jest.spyOn(batchRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getBatch('non-existent')).rejects.toThrow('Batch not found');
    });
  });

  describe('createBatch', () => {
    it('should create and return new batch', async () => {
      const createDto = {
        name: 'New Batch',
        projectId: 'project-123',
        description: 'Test batch',
      };

      const createdBatch = { ...mockBatch, ...createDto };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(batchRepository, 'create').mockReturnValue(createdBatch as any);
      jest.spyOn(batchRepository, 'save').mockResolvedValue(createdBatch);

      const result = await service.createBatch(createDto);

      expect(result).toEqual(createdBatch);
      expect(batchRepository.create).toHaveBeenCalledWith({
        ...createDto,
        status: BatchStatus.CREATED,
        totalTasks: 0,
        completedTasks: 0,
      });
    });

    it('should throw error when project not found', async () => {
      const createDto = {
        name: 'New Batch',
        projectId: 'non-existent',
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createBatch(createDto)).rejects.toThrow('Project not found');
    });
  });

  describe('updateBatch', () => {
    it('should update and return batch', async () => {
      const updateDto = {
        name: 'Updated Batch',
        status: BatchStatus.IN_PROGRESS,
      };

      const updatedBatch = { ...mockBatch, ...updateDto };

      jest.spyOn(batchRepository, 'findOne').mockResolvedValue(mockBatch);
      jest.spyOn(batchRepository, 'save').mockResolvedValue(updatedBatch);

      const result = await service.updateBatch('batch-123', updateDto);

      expect(result).toEqual(updatedBatch);
    });

    it('should throw error when batch not found', async () => {
      jest.spyOn(batchRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateBatch('non-existent', {})).rejects.toThrow('Batch not found');
    });
  });

  describe('allocateFiles', () => {
    it('should allocate files and create tasks', async () => {
      const allocateDto = {
        files: [
          { externalId: 'file1.pdf', priority: 1 },
          { externalId: 'file2.pdf', priority: 2 },
        ],
      };

      const createdTasks = [
        { ...mockTask, id: 'task-1', externalId: 'file1.pdf' },
        { ...mockTask, id: 'task-2', externalId: 'file2.pdf' },
      ];

      jest.spyOn(batchRepository, 'findOne').mockResolvedValue(mockBatch);
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(workflowRepository, 'findOne').mockResolvedValue({ id: 'workflow-123' } as any);
      jest.spyOn(taskRepository, 'create').mockReturnValueOnce(createdTasks[0] as any).mockReturnValueOnce(createdTasks[1] as any);
      jest.spyOn(taskRepository, 'save').mockResolvedValueOnce(createdTasks[0]).mockResolvedValueOnce(createdTasks[1]);

      const result = await service.allocateFiles('batch-123', allocateDto);

      expect(result).toHaveLength(2);
      expect(result[0].externalId).toBe('file1.pdf');
      expect(result[1].externalId).toBe('file2.pdf');
    });

    it('should throw error when batch not found', async () => {
      jest.spyOn(batchRepository, 'findOne').mockResolvedValue(null);

      await expect(service.allocateFiles('non-existent', { files: [] })).rejects.toThrow('Batch not found');
    });
  });

  describe('scanDirectoryAndCreateTasks', () => {
    it('should scan directory and create tasks', async () => {
      const scanDto = {
        directoryPath: '/test/path',
        fileExtensions: ['.pdf', '.jpg'],
      };

      const mockFiles = ['file1.pdf', 'file2.jpg'];
      const createdTasks = [
        { ...mockTask, id: 'task-1', externalId: 'file1.pdf' },
        { ...mockTask, id: 'task-2', externalId: 'file2.jpg' },
      ];

      // Mock file system operations
      const fs = require('fs');
      jest.spyOn(fs, 'readdirSync').mockReturnValue(mockFiles);
      jest.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true } as any);

      jest.spyOn(batchRepository, 'findOne').mockResolvedValue(mockBatch);
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(workflowRepository, 'findOne').mockResolvedValue({ id: 'workflow-123' } as any);
      jest.spyOn(taskRepository, 'create').mockReturnValueOnce(createdTasks[0] as any).mockReturnValueOnce(createdTasks[1] as any);
      jest.spyOn(taskRepository, 'save').mockResolvedValueOnce(createdTasks[0]).mockResolvedValueOnce(createdTasks[1]);

      const result = await service.scanDirectoryAndCreateTasks('batch-123', scanDto);

      expect(result.tasksCreated).toBe(2);
      expect(result.filesProcessed).toBe(2);
    });
  });

  describe('getUnassignedTasksForBatch', () => {
    it('should return unassigned tasks', async () => {
      const mockTasks = [mockTask];
      jest.spyOn(taskRepository, 'find').mockResolvedValue(mockTasks);

      const result = await service.getUnassignedTasksForBatch('batch-123');

      expect(result).toEqual(mockTasks);
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: { batchId: 'batch-123', status: 'pending' },
        order: { priority: 'ASC', createdAt: 'ASC' },
      });
    });
  });

  describe('autoAssignTasks', () => {
    it('should auto-assign tasks using round-robin method', async () => {
      const mockTasks = [mockTask];
      const mockUsers = [mockUser];

      jest.spyOn(taskRepository, 'find').mockResolvedValue(mockTasks);
      jest.spyOn(userRepository, 'find').mockResolvedValue(mockUsers);
      jest.spyOn(assignmentRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(assignmentRepository, 'save').mockResolvedValue({} as any);

      await service.autoAssignTasks(mockTasks, 'round-robin');

      expect(assignmentRepository.create).toHaveBeenCalledWith({
        taskId: mockTask.id,
        userId: mockUser.id,
        method: AssignmentMethod.AUTOMATIC,
        status: AssignmentStatus.ASSIGNED,
      });
    });
  });

  describe('assignTask', () => {
    it('should assign task to user', async () => {
      const assignDto = {
        taskId: 'task-123',
        userId: 'user-123',
        method: AssignmentMethod.MANUAL,
      };

      const mockAssignment = {
        id: 'assignment-123',
        taskId: 'task-123',
        userId: 'user-123',
        workflowStage: WorkflowStage.ANNOTATION,
        status: AssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        acceptedAt: null,
        completedAt: null,
        expiresAt: null,
        assignmentMethod: AssignmentMethod.MANUAL,
        assignmentOrder: 1,
        isPrimary: false,
        requiresConsensus: false,
        consensusGroupId: null,
        task: null,
        user: null,
        annotations: [],
        deletedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(assignmentRepository, 'create').mockReturnValue(mockAssignment as any);
      jest.spyOn(assignmentRepository, 'save').mockResolvedValue(mockAssignment);

      const result = await service.assignTask(assignDto);

      expect(result).toEqual(mockAssignment);
    });

    it('should throw error when task not found', async () => {
      const assignDto = {
        taskId: 'non-existent',
        userId: 'user-123',
      };

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(null);

      await expect(service.assignTask(assignDto)).rejects.toThrow('Task not found');
    });

    it('should throw error when user not found', async () => {
      const assignDto = {
        taskId: 'task-123',
        userId: 'non-existent',
      };

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.assignTask(assignDto)).rejects.toThrow('User not found');
    });
  });

  describe('pullNextTask', () => {
    it('should return next available task for user', async () => {
      const pullDto = {
        userId: 'user-123',
        projectId: 'project-123',
        workflowStage: WorkflowStage.ANNOTATION,
      };

      const availableTask = { ...mockTask, status: 'pending' };

      jest.spyOn(taskRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([availableTask]),
      } as any);

      const result = await service.pullNextTask(pullDto);

      expect(result).toEqual(availableTask);
    });

    it('should return null when no tasks available', async () => {
      const pullDto = {
        userId: 'user-123',
        projectId: 'project-123',
        workflowStage: WorkflowStage.ANNOTATION,
      };

      jest.spyOn(taskRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.pullNextTask(pullDto);

      expect(result).toBeNull();
    });
  });

  describe('Private methods', () => {
    describe('getEligibleUsers', () => {
      it('should return eligible users for project and stage', async () => {
        const mockUsers = [mockUser];

        jest.spyOn(userRepository, 'createQueryBuilder').mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockUsers),
        } as any);

        const result = await (service as any).getEligibleUsers('project-123', WorkflowStage.ANNOTATION);

        expect(result).toEqual(mockUsers);
      });
    });

    describe('roundRobinSelection', () => {
      it('should select user using round-robin algorithm', async () => {
        const users = [mockUser];
        const task = mockTask;

        jest.spyOn(assignmentRepository, 'createQueryBuilder').mockReturnValue({
          select: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ lastAssigneeId: null }),
        } as any);

        const result = await (service as any).roundRobinSelection(users, task);

        expect(result).toBe(mockUser.id);
      });
    });
  });
});