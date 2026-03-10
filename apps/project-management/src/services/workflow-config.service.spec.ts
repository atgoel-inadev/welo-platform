import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkflowConfigService } from './workflow-config.service';
import { Project, Workflow } from '@app/common/entities';

describe('WorkflowConfigService', () => {
  let service: WorkflowConfigService;
  let projectRepository: Repository<Project>;
  let workflowRepository: Repository<Workflow>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    configuration: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockWorkflow = {
    id: 'workflow-123',
    name: 'Test Workflow',
    projectId: 'project-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowConfigService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Workflow),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowConfigService>(WorkflowConfigService);
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    workflowRepository = module.get<Repository<Workflow>>(getRepositoryToken(Workflow));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listWorkflowConfigs', () => {
    it('should return all workflow configs when no projectId provided', async () => {
      const mockConfigs = [mockWorkflowConfig];
      jest.spyOn(workflowConfigRepository, 'find').mockResolvedValue(mockConfigs);

      const result = await service.listWorkflowConfigs();

      expect(result).toEqual(mockConfigs);
      expect(workflowConfigRepository.find).toHaveBeenCalledWith({
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter workflow configs by projectId', async () => {
      const mockConfigs = [mockWorkflowConfig];
      jest.spyOn(workflowConfigRepository, 'find').mockResolvedValue(mockConfigs);

      const result = await service.listWorkflowConfigs('project-123');

      expect(result).toEqual(mockConfigs);
      expect(workflowConfigRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getWorkflowConfig', () => {
    it('should return workflow config when found', async () => {
      jest.spyOn(workflowConfigRepository, 'findOne').mockResolvedValue(mockWorkflowConfig);

      const result = await service.getWorkflowConfig('config-123');

      expect(result).toEqual(mockWorkflowConfig);
      expect(workflowConfigRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'config-123' },
        relations: ['project'],
      });
    });

    it('should throw error when workflow config not found', async () => {
      jest.spyOn(workflowConfigRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getWorkflowConfig('non-existent')).rejects.toThrow('Workflow config not found');
    });
  });

  describe('createWorkflowConfig', () => {
    it('should create and return new workflow config', async () => {
      const createDto = {
        name: 'New Workflow Config',
        projectId: 'project-123',
        type: WorkflowType.ANNOTATION,
        config: { stages: ['created', 'assigned'] },
      };

      const createdConfig = { ...mockWorkflowConfig, ...createDto };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(workflowConfigRepository, 'create').mockReturnValue(createdConfig as any);
      jest.spyOn(workflowConfigRepository, 'save').mockResolvedValue(createdConfig);

      const result = await service.createWorkflowConfig(createDto);

      expect(result).toEqual(createdConfig);
      expect(workflowConfigRepository.create).toHaveBeenCalledWith({
        ...createDto,
        isActive: true,
        version: 1,
      });
    });

    it('should throw error when project not found', async () => {
      const createDto = {
        name: 'New Workflow Config',
        projectId: 'non-existent',
        type: WorkflowType.ANNOTATION,
        config: {},
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createWorkflowConfig(createDto)).rejects.toThrow('Project not found');
    });
  });

  describe('updateWorkflowConfig', () => {
    it('should update and return workflow config', async () => {
      const updateDto = {
        name: 'Updated Workflow Config',
        config: { stages: ['created', 'updated'] },
      };

      const updatedConfig = { ...mockWorkflowConfig, ...updateDto, version: 2 };

      jest.spyOn(workflowConfigRepository, 'findOne').mockResolvedValue(mockWorkflowConfig);
      jest.spyOn(workflowConfigRepository, 'save').mockResolvedValue(updatedConfig);

      const result = await service.updateWorkflowConfig('config-123', updateDto);

      expect(result).toEqual(updatedConfig);
      expect(result.version).toBe(2);
    });

    it('should throw error when workflow config not found', async () => {
      jest.spyOn(workflowConfigRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateWorkflowConfig('non-existent', {})).rejects.toThrow('Workflow config not found');
    });
  });

  describe('activateWorkflowConfig', () => {
    it('should activate workflow config successfully', async () => {
      const inactiveConfig = { ...mockWorkflowConfig, isActive: false };
      const activatedConfig = { ...inactiveConfig, isActive: true };

      jest.spyOn(workflowConfigRepository, 'findOne').mockResolvedValue(inactiveConfig);
      jest.spyOn(workflowConfigRepository, 'save').mockResolvedValue(activatedConfig);

      const result = await service.activateWorkflowConfig('config-123');

      expect(result.isActive).toBe(true);
    });

    it('should throw error when workflow config not found', async () => {
      jest.spyOn(workflowConfigRepository, 'findOne').mockResolvedValue(null);

      await expect(service.activateWorkflowConfig('non-existent')).rejects.toThrow('Workflow config not found');
    });
  });

  describe('deactivateWorkflowConfig', () => {
    it('should deactivate workflow config successfully', async () => {
      const activatedConfig = { ...mockWorkflowConfig, isActive: true };
      const deactivatedConfig = { ...activatedConfig, isActive: false };

      jest.spyOn(workflowConfigRepository, 'findOne').mockResolvedValue(activatedConfig);
      jest.spyOn(workflowConfigRepository, 'save').mockResolvedValue(deactivatedConfig);

      const result = await service.deactivateWorkflowConfig('config-123');

      expect(result.isActive).toBe(false);
    });

    it('should throw error when workflow config not found', async () => {
      jest.spyOn(workflowConfigRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deactivateWorkflowConfig('non-existent')).rejects.toThrow('Workflow config not found');
    });
  });

  describe('getActiveWorkflowConfigs', () => {
    it('should return active workflow configs for project', async () => {
      const mockConfigs = [mockWorkflowConfig];
      jest.spyOn(workflowConfigRepository, 'find').mockResolvedValue(mockConfigs);

      const result = await service.getActiveWorkflowConfigs('project-123');

      expect(result).toEqual(mockConfigs);
      expect(workflowConfigRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-123', isActive: true },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getWorkflowConfigsByType', () => {
    it('should return workflow configs by type', async () => {
      const mockConfigs = [mockWorkflowConfig];
      jest.spyOn(workflowConfigRepository, 'find').mockResolvedValue(mockConfigs);

      const result = await service.getWorkflowConfigsByType(WorkflowType.ANNOTATION);

      expect(result).toEqual(mockConfigs);
      expect(workflowConfigRepository.find).toHaveBeenCalledWith({
        where: { type: WorkflowType.ANNOTATION },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('cloneWorkflowConfig', () => {
    it('should clone workflow config successfully', async () => {
      const cloneDto = { name: 'Cloned Config' };
      const clonedConfig = {
        ...mockWorkflowConfig,
        id: 'new-config-id',
        name: 'Cloned Config',
        version: 1,
      };

      jest.spyOn(workflowConfigRepository, 'findOne').mockResolvedValue(mockWorkflowConfig);
      jest.spyOn(workflowConfigRepository, 'create').mockReturnValue(clonedConfig as any);
      jest.spyOn(workflowConfigRepository, 'save').mockResolvedValue(clonedConfig);

      const result = await service.cloneWorkflowConfig('config-123', cloneDto);

      expect(result.name).toBe('Cloned Config');
      expect(result.id).not.toBe('config-123');
      expect(result.version).toBe(1);
    });

    it('should throw error when workflow config not found', async () => {
      jest.spyOn(workflowConfigRepository, 'findOne').mockResolvedValue(null);

      await expect(service.cloneWorkflowConfig('non-existent', {})).rejects.toThrow('Workflow config not found');
    });
  });
});