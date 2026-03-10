import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UIConfigurationService } from './ui-configuration.service';
import { Project, UIConfiguration } from '@app/common/entities';

describe('UIConfigurationService', () => {
  let service: UIConfigurationService;
  let projectRepository: Repository<Project>;
  let uiConfigurationRepository: Repository<UIConfiguration>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
  } as Project;

  const mockUIConfig = {
    id: 'config-123',
    projectId: 'project-123',
    version: 1,
    configuration: {
      annotation: {
        tools: ['rectangle', 'polygon'],
        colors: ['red', 'blue'],
      },
      review: {
        showMetadata: true,
        allowComments: true,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UIConfiguration;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UIConfigurationService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UIConfiguration),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UIConfigurationService>(UIConfigurationService);
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    uiConfigurationRepository = module.get<Repository<UIConfiguration>>(getRepositoryToken(UIConfiguration));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrUpdateUIConfiguration', () => {
    it('should create new UI configuration', async () => {
      const configData = {
        annotation: {
          tools: ['rectangle', 'polygon'],
          colors: ['red', 'blue'],
        },
        review: {
          showMetadata: true,
          allowComments: true,
        },
      };

      const createdConfig = { ...mockUIConfig, configuration: configData };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(uiConfigurationRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(uiConfigurationRepository, 'create').mockReturnValue(createdConfig as any);
      jest.spyOn(uiConfigurationRepository, 'save').mockResolvedValue(createdConfig);

      const result = await service.createOrUpdateUIConfiguration('project-123', configData);

      expect(result).toEqual(createdConfig);
      expect(uiConfigurationRepository.create).toHaveBeenCalledWith({
        projectId: 'project-123',
        version: 1,
        configuration: configData,
      });
    });

    it('should update existing UI configuration', async () => {
      const configData = {
        annotation: {
          tools: ['circle', 'line'],
          colors: ['green', 'yellow'],
        },
      };

      const existingConfig = { ...mockUIConfig, version: 1 };
      const updatedConfig = {
        ...existingConfig,
        version: 2,
        configuration: configData,
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(uiConfigurationRepository, 'findOne').mockResolvedValue(existingConfig);
      jest.spyOn(uiConfigurationRepository, 'create').mockReturnValue(updatedConfig as any);
      jest.spyOn(uiConfigurationRepository, 'save').mockResolvedValue(updatedConfig);

      const result = await service.createOrUpdateUIConfiguration('project-123', configData);

      expect(result.version).toBe(2);
      expect(result.configuration).toEqual(configData);
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createOrUpdateUIConfiguration('non-existent', {})).rejects.toThrow('Project not found');
    });
  });

  describe('getUIConfiguration', () => {
    it('should return latest UI configuration', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(uiConfigurationRepository, 'findOne').mockResolvedValue(mockUIConfig);

      const result = await service.getUIConfiguration('project-123');

      expect(result).toEqual({
        projectId: 'project-123',
        version: 1,
        configuration: mockUIConfig.configuration,
        createdAt: mockUIConfig.createdAt,
        updatedAt: mockUIConfig.updatedAt,
      });
    });

    it('should return default configuration when no config exists', async () => {
      const defaultConfig = {
        annotation: {
          tools: ['rectangle'],
          colors: ['red', 'blue', 'green'],
        },
        review: {
          showMetadata: true,
          allowComments: true,
        },
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(uiConfigurationRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getUIConfiguration('project-123');

      expect(result.configuration).toEqual(defaultConfig);
      expect(result.version).toBe(0);
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getUIConfiguration('non-existent')).rejects.toThrow('Project not found');
    });
  });

  describe('getUIConfigurationVersions', () => {
    it('should return all configuration versions', async () => {
      const mockVersions = [
        { version: 1, createdAt: new Date() },
        { version: 2, createdAt: new Date() },
      ];

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(uiConfigurationRepository, 'createQueryBuilder').mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockVersions),
      } as any);

      const result = await service.getUIConfigurationVersions('project-123');

      expect(result).toEqual(mockVersions);
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getUIConfigurationVersions('non-existent')).rejects.toThrow('Project not found');
    });
  });

  describe('getUIConfigurationVersion', () => {
    it('should return specific configuration version', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(uiConfigurationRepository, 'findOne').mockResolvedValue(mockUIConfig);

      const result = await service.getUIConfigurationVersion('project-123', 1);

      expect(result).toEqual(mockUIConfig);
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getUIConfigurationVersion('non-existent', 1)).rejects.toThrow('Project not found');
    });

    it('should throw error when version not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(uiConfigurationRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getUIConfigurationVersion('project-123', 999)).rejects.toThrow('Configuration version not found');
    });
  });

  describe('rollbackToVersion', () => {
    it('should rollback to specified version', async () => {
      const targetVersion = { ...mockUIConfig, version: 1 };
      const newVersion = { ...targetVersion, version: 3, id: 'new-config-id' };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(uiConfigurationRepository, 'findOne').mockResolvedValue(targetVersion);
      jest.spyOn(uiConfigurationRepository, 'create').mockReturnValue(newVersion as any);
      jest.spyOn(uiConfigurationRepository, 'save').mockResolvedValue(newVersion);

      const result = await service.rollbackToVersion('project-123', 1);

      expect(result.version).toBe(3);
      expect(result.configuration).toEqual(targetVersion.configuration);
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.rollbackToVersion('non-existent', 1)).rejects.toThrow('Project not found');
    });

    it('should throw error when target version not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(uiConfigurationRepository, 'findOne').mockResolvedValue(null);

      await expect(service.rollbackToVersion('project-123', 999)).rejects.toThrow('Target version not found');
    });
  });

  describe('deleteUIConfiguration', () => {
    it('should delete all configurations for project', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(uiConfigurationRepository, 'delete').mockResolvedValue({ affected: 2 } as any);

      await expect(service.deleteUIConfiguration('project-123')).resolves.toBeUndefined();
      expect(uiConfigurationRepository.delete).toHaveBeenCalledWith({
        projectId: 'project-123',
      });
    });

    it('should throw error when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deleteUIConfiguration('non-existent')).rejects.toThrow('Project not found');
    });
  });

  describe('getUIConfigurationForTask', () => {
    it('should return UI configuration for task', async () => {
      const taskId = 'task-123';
      const mockTask = {
        id: taskId,
        projectId: 'project-123',
        project: mockProject,
      };

      jest.spyOn(service as any, 'getTaskWithProject').mockResolvedValue(mockTask);
      jest.spyOn(uiConfigurationRepository, 'findOne').mockResolvedValue(mockUIConfig);

      const result = await (service as any).getUIConfigurationForTask(taskId);

      expect(result).toEqual(mockUIConfig);
    });

    it('should return default configuration when no config exists for task', async () => {
      const taskId = 'task-123';
      const mockTask = {
        id: taskId,
        projectId: 'project-123',
        project: mockProject,
      };

      jest.spyOn(service as any, 'getTaskWithProject').mockResolvedValue(mockTask);
      jest.spyOn(uiConfigurationRepository, 'findOne').mockResolvedValue(null);

      const result = await (service as any).getUIConfigurationForTask(taskId);

      expect(result.configuration).toBeDefined();
      expect(result.version).toBe(0);
    });
  });
});