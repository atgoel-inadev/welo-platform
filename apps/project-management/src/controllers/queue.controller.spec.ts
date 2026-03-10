import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueService } from '../services/queue.service';
import { QueueType } from '@app/common/enums';

describe('QueueController', () => {
  let controller: QueueController;
  let queueService: QueueService;

  const mockQueue = {
    id: 'queue-123',
    name: 'Test Queue',
    projectId: 'project-123',
    status: 'ACTIVE',
    maxConcurrency: 5,
    currentConcurrency: 2,
    totalTasks: 100,
    pendingTasks: 50,
    processingTasks: 30,
    completedTasks: 20,
    failedTasks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueueService = {
    listQueues: jest.fn(),
    getQueue: jest.fn(),
    createQueue: jest.fn(),
    updateQueue: jest.fn(),
    pauseQueue: jest.fn(),
    resumeQueue: jest.fn(),
    archiveQueue: jest.fn(),
    getQueueStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    controller = module.get<QueueController>(QueueController);
    queueService = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /queues', () => {
    it('should return list of queues', async () => {
      const mockQueues = [mockQueue];
      mockQueueService.listQueues.mockResolvedValue(mockQueues);

      const result = await controller.listQueues();

      expect(result).toEqual(mockQueues);
      expect(mockQueueService.listQueues).toHaveBeenCalled();
    });

    it('should filter queues by projectId', async () => {
      const mockQueues = [mockQueue];
      mockQueueService.listQueues.mockResolvedValue(mockQueues);

      const result = await controller.listQueues('project-123');

      expect(result).toEqual(mockQueues);
      expect(mockQueueService.listQueues).toHaveBeenCalledWith('project-123');
    });
  });

  describe('GET /queues/:id', () => {
    it('should return queue by id', async () => {
      mockQueueService.getQueue.mockResolvedValue(mockQueue);

      const result = await controller.getQueue('queue-123');

      expect(result).toEqual(mockQueue);
      expect(mockQueueService.getQueue).toHaveBeenCalledWith('queue-123');
    });
  });

  describe('POST /queues', () => {
    it('should create new queue', async () => {
      const createDto = {
        name: 'New Queue',
        projectId: 'project-123',
        queueType: QueueType.ANNOTATION,
        priorityRules: { priorityField: 'priority', sortOrder: 'DESC', filters: [] },
      };

      mockQueueService.createQueue.mockResolvedValue(mockQueue);

      const result = await controller.createQueue(createDto);

      expect(result).toEqual(mockQueue);
      expect(mockQueueService.createQueue).toHaveBeenCalledWith(createDto);
    });
  });

  describe('PUT /queues/:id', () => {
    it('should update queue', async () => {
      const updateDto = {
        name: 'Updated Queue',
        maxConcurrency: 8,
        description: 'Updated Description',
      };

      const updatedQueue = { ...mockQueue, ...updateDto };
      mockQueueService.updateQueue.mockResolvedValue(updatedQueue);

      const result = await controller.updateQueue('queue-123', updateDto);

      expect(result).toEqual(updatedQueue);
      expect(mockQueueService.updateQueue).toHaveBeenCalledWith('queue-123', updateDto);
    });
  });

  describe('POST /queues/:id/pause', () => {
    it('should pause queue', async () => {
      const pausedQueue = { ...mockQueue, status: 'PAUSED' };
      mockQueueService.pauseQueue.mockResolvedValue(pausedQueue);

      const result = await controller.pauseQueue('queue-123');

      expect(result).toEqual(pausedQueue);
      expect(mockQueueService.pauseQueue).toHaveBeenCalledWith('queue-123');
    });
  });

  describe('POST /queues/:id/resume', () => {
    it('should resume queue', async () => {
      const resumedQueue = { ...mockQueue, status: 'ACTIVE' };
      mockQueueService.resumeQueue.mockResolvedValue(resumedQueue);

      const result = await controller.resumeQueue('queue-123');

      expect(result).toEqual(resumedQueue);
      expect(mockQueueService.resumeQueue).toHaveBeenCalledWith('queue-123');
    });
  });

  describe('DELETE /queues/:id', () => {
    it('should archive queue', async () => {
      mockQueueService.archiveQueue.mockResolvedValue(undefined);

      await controller.archiveQueue('queue-123');

      expect(mockQueueService.archiveQueue).toHaveBeenCalledWith('queue-123');
    });
  });

  describe('GET /queues/:id/stats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        id: 'queue-123',
        totalTasks: 100,
        pendingTasks: 50,
        processingTasks: 30,
        completedTasks: 20,
        failedTasks: 0,
        status: 'ACTIVE',
        currentConcurrency: 2,
        maxConcurrency: 5,
      };

      mockQueueService.getQueueStats.mockResolvedValue(mockStats);

      const result = await controller.getQueueStats('queue-123');

      expect(result).toEqual(mockStats);
      expect(mockQueueService.getQueueStats).toHaveBeenCalledWith('queue-123');
    });
  });
});