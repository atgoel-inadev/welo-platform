import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueueService } from './queue.service';
import { Queue, Project } from '@app/common/entities';
import { QueueStatus, QueueType } from '@app/common/enums';

describe('QueueService', () => {
  let service: QueueService;
  let queueRepository: Repository<Queue>;
  let projectRepository: Repository<Project>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
  } as Project;

  const mockQueue = {
    id: 'queue-123',
    name: 'Test Queue',
    projectId: 'project-123',
    queueType: QueueType.ANNOTATION,
    status: QueueStatus.ACTIVE,
    priorityRules: {
      priorityField: 'priority',
      sortOrder: 'DESC',
      filters: [],
    },
    assignmentRules: {
      autoAssign: true,
      capacityLimits: {},
      skillRequirements: [],
      loadBalancing: {},
    },
    totalTasks: 100,
    pendingTasks: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Queue;
    updatedAt: new Date(),
  } as Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getRepositoryToken(Queue),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getRawOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    queueRepository = module.get<Repository<Queue>>(getRepositoryToken(Queue));
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listQueues', () => {
    it('should return all queues when no projectId provided', async () => {
      const mockQueues = [mockQueue];
      jest.spyOn(queueRepository, 'find').mockResolvedValue(mockQueues);

      const result = await service.listQueues();

      expect(result).toEqual(mockQueues);
      expect(queueRepository.find).toHaveBeenCalledWith({
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter queues by projectId', async () => {
      const mockQueues = [mockQueue];
      jest.spyOn(queueRepository, 'find').mockResolvedValue(mockQueues);

      const result = await service.listQueues('project-123');

      expect(result).toEqual(mockQueues);
      expect(queueRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getQueue', () => {
    it('should return queue when found', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(mockQueue);

      const result = await service.getQueue('queue-123');

      expect(result).toEqual(mockQueue);
      expect(queueRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'queue-123' },
        relations: ['project'],
      });
    });

    it('should throw error when queue not found', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getQueue('non-existent')).rejects.toThrow('Queue not found');
    });
  });

  describe('createQueue', () => {
    it('should create and return new queue', async () => {
      const createDto = {
        name: 'New Queue',
        projectId: 'project-123',
        maxConcurrency: 10,
      };

      const createdQueue = { ...mockQueue, ...createDto };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(queueRepository, 'create').mockReturnValue(createdQueue as any);
      jest.spyOn(queueRepository, 'save').mockResolvedValue(createdQueue);

      const result = await service.createQueue(createDto);

      expect(result).toEqual(createdQueue);
      expect(queueRepository.create).toHaveBeenCalledWith({
        ...createDto,
        status: QueueStatus.ACTIVE,
        currentConcurrency: 0,
        totalTasks: 0,
        pendingTasks: 0,
        processingTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
      });
    });

    it('should throw error when project not found', async () => {
      const createDto = {
        name: 'New Queue',
        projectId: 'non-existent',
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createQueue(createDto)).rejects.toThrow('Project not found');
    });
  });

  describe('updateQueue', () => {
    it('should update and return queue', async () => {
      const updateDto = {
        name: 'Updated Queue',
        maxConcurrency: 8,
      };

      const updatedQueue = { ...mockQueue, ...updateDto };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(mockQueue);
      jest.spyOn(queueRepository, 'save').mockResolvedValue(updatedQueue);

      const result = await service.updateQueue('queue-123', updateDto);

      expect(result).toEqual(updatedQueue);
    });

    it('should throw error when queue not found', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateQueue('non-existent', {})).rejects.toThrow('Queue not found');
    });
  });

  describe('pauseQueue', () => {
    it('should pause queue successfully', async () => {
      const pausedQueue = { ...mockQueue, status: QueueStatus.PAUSED };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(mockQueue);
      jest.spyOn(queueRepository, 'save').mockResolvedValue(pausedQueue);

      const result = await service.pauseQueue('queue-123');

      expect(result.status).toBe(QueueStatus.PAUSED);
    });

    it('should throw error when queue not found', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(null);

      await expect(service.pauseQueue('non-existent')).rejects.toThrow('Queue not found');
    });
  });

  describe('resumeQueue', () => {
    it('should resume queue successfully', async () => {
      const pausedQueue = { ...mockQueue, status: QueueStatus.PAUSED };
      const resumedQueue = { ...pausedQueue, status: QueueStatus.ACTIVE };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(pausedQueue);
      jest.spyOn(queueRepository, 'save').mockResolvedValue(resumedQueue);

      const result = await service.resumeQueue('queue-123');

      expect(result.status).toBe(QueueStatus.ACTIVE);
    });

    it('should throw error when queue not found', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(null);

      await expect(service.resumeQueue('non-existent')).rejects.toThrow('Queue not found');
    });
  });

  describe('archiveQueue', () => {
    it('should archive queue successfully', async () => {
      const archivedQueue = { ...mockQueue, status: QueueStatus.ARCHIVED };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(mockQueue);
      jest.spyOn(queueRepository, 'save').mockResolvedValue(archivedQueue);

      const result = await service.archiveQueue('queue-123');

      expect(result.status).toBe(QueueStatus.ARCHIVED);
    });

    it('should throw error when queue not found', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(null);

      await expect(service.archiveQueue('non-existent')).rejects.toThrow('Queue not found');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        id: 'queue-123',
        totalTasks: 100,
        pendingTasks: 50,
        status: QueueStatus.ACTIVE,
      };

      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(mockQueue);
      jest.spyOn(queueRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
      } as any);

      const result = await service.getQueueStats('queue-123');

      expect(result).toEqual(mockStats);
    });

    it('should throw error when queue not found', async () => {
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getQueueStats('non-existent')).rejects.toThrow('Queue not found');
    });
  });
});