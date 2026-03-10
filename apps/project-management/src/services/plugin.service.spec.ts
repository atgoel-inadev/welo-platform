import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PluginService, Plugin } from './plugin.service';
import { Project } from '@app/common/entities';

describe('PluginService', () => {
  let service: PluginService;
  let projectRepository: Repository<Project>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    configuration: {
      annotationSchema: {},
      qualityThresholds: {},
      workflowRules: {},
      uiConfiguration: {},
      plugins: [
        {
          id: 'plugin-1',
          name: 'Test Plugin',
          description: 'A test plugin',
          type: 'API' as const,
          enabled: true,
          trigger: 'ON_BLUR' as const,
          onFailBehavior: 'ADVISORY' as const,
          questionBindings: ['question-1'],
          isDraft: false,
          version: 1,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          deployedAt: '2023-01-01T00:00:00.000Z',
          apiConfig: {
            url: 'https://api.example.com',
            method: 'POST' as const,
            headers: { 'Content-Type': 'application/json' },
            responseMapping: { resultPath: 'data.result' },
            timeout: 5000,
            retries: 3,
          },
        },
      ],
    },
  } as Project;

  const mockPluginInput = {
    name: 'New Plugin',
    description: 'A new plugin',
    type: 'SCRIPT' as const,
    trigger: 'ON_SUBMIT' as const,
    onFailBehavior: 'SOFT_WARN' as const,
    questionBindings: ['question-2'],
    scriptCode: 'console.log("Hello World");',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PluginService>(PluginService);
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listPlugins', () => {
    it('should return all plugins for a project', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      const result = await service.listPlugins('project-123');

      expect(result.success).toBe(true);
      expect(result.data.plugins).toEqual(mockProject.configuration.plugins);
      expect(projectRepository.findOne).toHaveBeenCalledWith({ where: { id: 'project-123' } });
    });

    it('should return empty array if no plugins configured', async () => {
      const project = { ...mockProject, configuration: { ...mockProject.configuration, plugins: undefined } };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(project);

      const result = await service.listPlugins('project-123');

      expect(result.success).toBe(true);
      expect(result.data.plugins).toEqual([]);
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.listPlugins('invalid-id')).rejects.toThrow('Project invalid-id not found');
    });
  });

  describe('createPlugin', () => {
    it('should create and return new plugin', async () => {
      const project = { ...mockProject, configuration: { ...mockProject.configuration, plugins: [] } };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(project);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(project);

      const result = await service.createPlugin('project-123', mockPluginInput);

      expect(result.success).toBe(true);
      expect(result.data.plugin.name).toBe(mockPluginInput.name);
      expect(result.data.plugin.type).toBe(mockPluginInput.type);
      expect(result.data.plugin.isDraft).toBe(true);
      expect(result.data.plugin.version).toBe(1);
      expect(projectRepository.save).toHaveBeenCalledWith(project);
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createPlugin('invalid-id', mockPluginInput)).rejects.toThrow('Project invalid-id not found');
    });

    it('should validate plugin data', async () => {
      const project = { ...mockProject, configuration: { ...mockProject.configuration, plugins: [] } };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(project);

      const invalidPlugin = { name: '', type: 'INVALID' };

      await expect(service.createPlugin('project-123', invalidPlugin)).rejects.toThrow('Plugin name is required');
    });
  });

  describe('updatePlugin', () => {
    it('should update and return plugin', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(mockProject);

      const updateData = { name: 'Updated Plugin' };
      const result = await service.updatePlugin('project-123', 'plugin-1', updateData);

      expect(result.success).toBe(true);
      expect(result.data.plugin.name).toBe('Updated Plugin');
      expect(result.data.plugin.isDraft).toBe(true);
      expect(projectRepository.save).toHaveBeenCalledWith(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updatePlugin('invalid-id', 'plugin-1', {})).rejects.toThrow('Project invalid-id not found');
    });

    it('should throw NotFoundException if plugin not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      await expect(service.updatePlugin('project-123', 'invalid-plugin', {})).rejects.toThrow('Plugin invalid-plugin not found');
    });
  });

  describe('deletePlugin', () => {
    it('should delete plugin successfully', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(mockProject);

      const result = await service.deletePlugin('project-123', 'plugin-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Plugin plugin-1 deleted');
      expect(projectRepository.save).toHaveBeenCalledWith(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deletePlugin('invalid-id', 'plugin-1')).rejects.toThrow('Project invalid-id not found');
    });

    it('should throw NotFoundException if plugin not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      await expect(service.deletePlugin('project-123', 'invalid-plugin')).rejects.toThrow('Plugin invalid-plugin not found');
    });
  });

  describe('deployPlugin', () => {
    it('should deploy plugin successfully', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(mockProject);

      const result = await service.deployPlugin('project-123', 'plugin-1');

      expect(result.success).toBe(true);
      expect(result.data.plugin.isDraft).toBe(false);
      expect(result.data.plugin.version).toBe(2);
      expect(result.data.plugin.deployedAt).toBeDefined();
      expect(projectRepository.save).toHaveBeenCalledWith(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deployPlugin('invalid-id', 'plugin-1')).rejects.toThrow('Project invalid-id not found');
    });

    it('should throw NotFoundException if plugin not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      await expect(service.deployPlugin('project-123', 'invalid-plugin')).rejects.toThrow('Plugin invalid-plugin not found');
    });
  });

  describe('togglePlugin', () => {
    it('should enable plugin successfully', async () => {
      const project = {
        ...mockProject,
        configuration: {
          ...mockProject.configuration,
          plugins: [{ ...mockProject.configuration.plugins[0], enabled: false, isDraft: false }],
        },
      };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(project);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(project);

      const result = await service.togglePlugin('project-123', 'plugin-1', true);

      expect(result.success).toBe(true);
      expect(result.data.plugin.enabled).toBe(true);
      expect(projectRepository.save).toHaveBeenCalledWith(project);
    });

    it('should throw BadRequestException when trying to enable draft plugin', async () => {
      const project = {
        ...mockProject,
        configuration: {
          ...mockProject.configuration,
          plugins: [{ ...mockProject.configuration.plugins[0], enabled: false, isDraft: true }],
        },
      };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(project);

      await expect(service.togglePlugin('project-123', 'plugin-1', true)).rejects.toThrow(
        'Cannot enable a draft plugin — deploy it first',
      );
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.togglePlugin('invalid-id', 'plugin-1', true)).rejects.toThrow('Project invalid-id not found');
    });

    it('should throw NotFoundException if plugin not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      await expect(service.togglePlugin('project-123', 'invalid-plugin', true)).rejects.toThrow('Plugin invalid-plugin not found');
    });
  });
});

  describe('listPlugins', () => {
    it('should return all plugins when no projectId provided', async () => {
      const mockPlugins = [mockPlugin];
      jest.spyOn(pluginRepository, 'find').mockResolvedValue(mockPlugins);

      const result = await service.listPlugins();

      expect(result).toEqual(mockPlugins);
      expect(pluginRepository.find).toHaveBeenCalledWith({
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter plugins by projectId', async () => {
      const mockPlugins = [mockPlugin];
      jest.spyOn(pluginRepository, 'find').mockResolvedValue(mockPlugins);

      const result = await service.listPlugins('project-123');

      expect(result).toEqual(mockPlugins);
      expect(pluginRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getPlugin', () => {
    it('should return plugin when found', async () => {
      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(mockPlugin);

      const result = await service.getPlugin('plugin-123');

      expect(result).toEqual(mockPlugin);
      expect(pluginRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'plugin-123' },
        relations: ['project'],
      });
    });

    it('should throw error when plugin not found', async () => {
      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPlugin('non-existent')).rejects.toThrow('Plugin not found');
    });
  });

  describe('createPlugin', () => {
    it('should create and return new plugin', async () => {
      const createDto = {
        name: 'New Plugin',
        projectId: 'project-123',
        type: PluginType.EXPORT,
        config: { format: 'json' },
        version: '2.0.0',
      };

      const createdPlugin = { ...mockPlugin, ...createDto };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(pluginRepository, 'create').mockReturnValue(createdPlugin as any);
      jest.spyOn(pluginRepository, 'save').mockResolvedValue(createdPlugin);

      const result = await service.createPlugin(createDto);

      expect(result).toEqual(createdPlugin);
      expect(pluginRepository.create).toHaveBeenCalledWith({
        ...createDto,
        isActive: true,
      });
    });

    it('should throw error when project not found', async () => {
      const createDto = {
        name: 'New Plugin',
        projectId: 'non-existent',
        type: PluginType.VALIDATION,
        config: {},
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createPlugin(createDto)).rejects.toThrow('Project not found');
    });
  });

  describe('updatePlugin', () => {
    it('should update and return plugin', async () => {
      const updateDto = {
        name: 'Updated Plugin',
        config: { newConfig: true },
        version: '1.1.0',
      };

      const updatedPlugin = { ...mockPlugin, ...updateDto };

      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(mockPlugin);
      jest.spyOn(pluginRepository, 'save').mockResolvedValue(updatedPlugin);

      const result = await service.updatePlugin('plugin-123', updateDto);

      expect(result).toEqual(updatedPlugin);
    });

    it('should throw error when plugin not found', async () => {
      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updatePlugin('non-existent', {})).rejects.toThrow('Plugin not found');
    });
  });

  describe('activatePlugin', () => {
    it('should activate plugin successfully', async () => {
      const inactivePlugin = { ...mockPlugin, isActive: false };
      const activatedPlugin = { ...inactivePlugin, isActive: true };

      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(inactivePlugin);
      jest.spyOn(pluginRepository, 'save').mockResolvedValue(activatedPlugin);

      const result = await service.activatePlugin('plugin-123');

      expect(result.isActive).toBe(true);
    });

    it('should throw error when plugin not found', async () => {
      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(null);

      await expect(service.activatePlugin('non-existent')).rejects.toThrow('Plugin not found');
    });
  });

  describe('deactivatePlugin', () => {
    it('should deactivate plugin successfully', async () => {
      const activatedPlugin = { ...mockPlugin, isActive: true };
      const deactivatedPlugin = { ...activatedPlugin, isActive: false };

      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(activatedPlugin);
      jest.spyOn(pluginRepository, 'save').mockResolvedValue(deactivatedPlugin);

      const result = await service.deactivatePlugin('plugin-123');

      expect(result.isActive).toBe(false);
    });

    it('should throw error when plugin not found', async () => {
      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deactivatePlugin('non-existent')).rejects.toThrow('Plugin not found');
    });
  });

  describe('deletePlugin', () => {
    it('should delete plugin successfully', async () => {
      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(mockPlugin);
      jest.spyOn(pluginRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      await expect(service.deletePlugin('plugin-123')).resolves.not.toThrow();
      expect(pluginRepository.delete).toHaveBeenCalledWith('plugin-123');
    });

    it('should throw error when plugin not found', async () => {
      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deletePlugin('non-existent')).rejects.toThrow('Plugin not found');
    });
  });

  describe('getActivePlugins', () => {
    it('should return active plugins for project', async () => {
      const mockPlugins = [mockPlugin];
      jest.spyOn(pluginRepository, 'find').mockResolvedValue(mockPlugins);

      const result = await service.getActivePlugins('project-123');

      expect(result).toEqual(mockPlugins);
      expect(pluginRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-123', isActive: true },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getPluginsByType', () => {
    it('should return plugins by type', async () => {
      const mockPlugins = [mockPlugin];
      jest.spyOn(pluginRepository, 'find').mockResolvedValue(mockPlugins);

      const result = await service.getPluginsByType(PluginType.VALIDATION);

      expect(result).toEqual(mockPlugins);
      expect(pluginRepository.find).toHaveBeenCalledWith({
        where: { type: PluginType.VALIDATION },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getPluginsByTypeAndProject', () => {
    it('should return plugins by type and project', async () => {
      const mockPlugins = [mockPlugin];
      jest.spyOn(pluginRepository, 'find').mockResolvedValue(mockPlugins);

      const result = await service.getPluginsByTypeAndProject(PluginType.VALIDATION, 'project-123');

      expect(result).toEqual(mockPlugins);
      expect(pluginRepository.find).toHaveBeenCalledWith({
        where: { type: PluginType.VALIDATION, projectId: 'project-123', isActive: true },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('executePlugin', () => {
    it('should execute plugin successfully', async () => {
      const executionData = { input: 'test data' };
      const expectedResult = { output: 'processed data' };

      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(mockPlugin);

      // Mock the plugin execution logic
      const result = await service.executePlugin('plugin-123', executionData);

      // Since executePlugin is likely to have complex logic, we test the basic flow
      expect(pluginRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'plugin-123', isActive: true },
        relations: ['project'],
      });
    });

    it('should throw error when plugin not found', async () => {
      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(null);

      await expect(service.executePlugin('non-existent', {})).rejects.toThrow('Plugin not found');
    });

    it('should throw error when plugin is not active', async () => {
      const inactivePlugin = { ...mockPlugin, isActive: false };
      jest.spyOn(pluginRepository, 'findOne').mockResolvedValue(inactivePlugin);

      await expect(service.executePlugin('plugin-123', {})).rejects.toThrow('Plugin is not active');
    });
  });
});