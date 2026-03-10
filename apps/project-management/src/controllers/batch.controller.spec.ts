import { Test, TestingModule } from '@nestjs/testing';
import { BatchController } from './batch.controller';
import { BatchService } from '../services/batch.service';

describe('BatchController', () => {
  let controller: BatchController;

  const mockBatch = {
    id: 'batch-123',
    name: 'Test Batch',
    projectId: 'project-123',
    status: 'ACTIVE',
    totalTasks: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBatchService = {
    listBatches: jest.fn(),
    getBatch: jest.fn(),
    createBatch: jest.fn(),
    updateBatch: jest.fn(),
    allocateFiles: jest.fn(),
    allocateFolder: jest.fn(),
    scanDirectoryAndCreateTasks: jest.fn(),
    getBatchStatistics: jest.fn(),
    completeBatch: jest.fn(),
    getUnassignedTasksForBatch: jest.fn(),
    autoAssignTasks: jest.fn(),
    assignTask: jest.fn(),
    pullNextTask: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchController],
      providers: [
        {
          provide: BatchService,
          useValue: mockBatchService,
        },
      ],
    }).compile();

    controller = module.get<BatchController>(BatchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /batches', () => {
    it('should return list of batches', async () => {
      const mockBatches = [mockBatch];
      mockBatchService.listBatches.mockResolvedValue(mockBatches);

      const result = await controller.listBatches();

      expect(result).toEqual(mockBatches);
      expect(mockBatchService.listBatches).toHaveBeenCalled();
    });

    it('should filter batches by projectId', async () => {
      const mockBatches = [mockBatch];
      mockBatchService.listBatches.mockResolvedValue(mockBatches);

      const result = await controller.listBatches('project-123');

      expect(result).toEqual(mockBatches);
      expect(mockBatchService.listBatches).toHaveBeenCalledWith('project-123');
    });
  });

  describe('GET /batches/:id', () => {
    it('should return batch by id', async () => {
      mockBatchService.getBatch.mockResolvedValue(mockBatch);

      const result = await controller.getBatch('batch-123');

      expect(result).toEqual(mockBatch);
      expect(mockBatchService.getBatch).toHaveBeenCalledWith('batch-123');
    });
  });

  describe('POST /batches', () => {
    it('should create new batch', async () => {
      const createDto = {
        name: 'New Batch',
        projectId: 'project-123',
        description: 'New Batch Description',
      };

      mockBatchService.createBatch.mockResolvedValue(mockBatch);

      const result = await controller.createBatch(createDto);

      expect(result).toEqual(mockBatch);
      expect(mockBatchService.createBatch).toHaveBeenCalledWith(createDto);
    });
  });

  describe('PUT /batches/:id', () => {
    it('should update batch', async () => {
      const updateDto = {
        name: 'Updated Batch',
        description: 'Updated Description',
      };

      const updatedBatch = { ...mockBatch, ...updateDto };
      mockBatchService.updateBatch.mockResolvedValue(updatedBatch);

      const result = await controller.updateBatch('batch-123', updateDto);

      expect(result).toEqual(updatedBatch);
      expect(mockBatchService.updateBatch).toHaveBeenCalledWith('batch-123', updateDto);
    });
  });

  describe('POST /batches/:id/allocate-files', () => {
    it('should allocate files to batch', async () => {
      const allocateDto = {
        files: [
          { externalId: 'file-1', fileType: 'CSV', fileUrl: 'http://example.com/file1.csv' },
          { externalId: 'file-2', fileType: 'CSV', fileUrl: 'http://example.com/file2.csv' },
        ],
      };

      const allocatedBatch = { ...mockBatch, totalTasks: 2 };
      mockBatchService.allocateFiles.mockResolvedValue(allocatedBatch);

      const result = await controller.allocateFiles('batch-123', allocateDto);

      expect(result).toEqual(allocatedBatch);
      expect(mockBatchService.allocateFiles).toHaveBeenCalledWith('batch-123', allocateDto);
    });
  });

  describe('POST /batches/:id/scan-directory', () => {
    it('should scan directory and create tasks', async () => {
      const scanDto = {
        directoryPath: '/path/to/files',
        filePattern: '*.jpg',
      };

      const scannedBatch = { ...mockBatch, totalTasks: 50 };
      mockBatchService.scanDirectoryAndCreateTasks.mockResolvedValue(scannedBatch);

      const result = await controller.scanDirectory('batch-123', scanDto);

      expect(result).toEqual(scannedBatch);
      expect(mockBatchService.scanDirectoryAndCreateTasks).toHaveBeenCalledWith('batch-123', scanDto);
    });
  });

  describe('POST /batches/:id/auto-assign', () => {
    it('should auto assign tasks', async () => {
      const autoAssignDto = {
        assignmentMethod: 'AUTO_ROUND_ROBIN',
      };

      mockBatchService.getUnassignedTasksForBatch.mockResolvedValue([{ id: 'task-1' }, { id: 'task-2' }]);
      mockBatchService.autoAssignTasks.mockResolvedValue(undefined);

      const result = await controller.autoAssignTasksInBatch('batch-123', autoAssignDto);

      expect(result.success).toBe(true);
      expect(result.assignedCount).toBe(2);
      expect(mockBatchService.getUnassignedTasksForBatch).toHaveBeenCalledWith('batch-123');
      expect(mockBatchService.autoAssignTasks).toHaveBeenCalled();
    });
  });

  describe('POST /batches/assign-task', () => {
    it('should assign specific task', async () => {
      const assignDto = {
        taskId: 'task-123',
        userId: 'user-456',
      };

      const assignedTask = { id: 'task-123', assignedTo: 'user-456' };
      mockBatchService.assignTask.mockResolvedValue(assignedTask);

      const result = await controller.assignTask(assignDto);

      expect(result).toEqual(assignedTask);
      expect(mockBatchService.assignTask).toHaveBeenCalledWith(assignDto);
    });
  });

  describe('POST /batches/pull-next-task', () => {
    it('should pull next task for user', async () => {
      const pullDto = {
        userId: 'user-123',
        projectId: 'project-123',
      };

      const nextTask = { id: 'task-789', assignedTo: 'user-123' };
      mockBatchService.pullNextTask.mockResolvedValue(nextTask);

      const result = await controller.pullNextTask(pullDto);

      expect(result).toEqual(nextTask);
      expect(mockBatchService.pullNextTask).toHaveBeenCalledWith(pullDto);
    });
  });
});