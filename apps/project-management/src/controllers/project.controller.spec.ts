import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from './project.controller';
import { ProjectService } from '../services/project.service';
import { WorkflowConfigService } from '../services/workflow-config.service';
import { AnnotationQuestionService } from '../services/annotation-question.service';
import { ProjectTeamService } from '../services/project-team.service';
import { PluginService } from '../services/plugin.service';
import { SecretService } from '../services/secret.service';

describe('ProjectController', () => {
  let controller: ProjectController;
  let projectService: ProjectService;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    description: 'Test Description',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProjectService = {
    listProjects: jest.fn(),
    getProject: jest.fn(),
    createProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    getProjectStatistics: jest.fn(),
    setSupportedFileTypes: jest.fn(),
    getSupportedFileTypes: jest.fn(),
    cloneProject: jest.fn(),
  };

  const mockWorkflowConfigService = {
    configureWorkflow: jest.fn(),
    getWorkflowConfig: jest.fn(),
  };

  const mockAnnotationQuestionService = {
    addQuestionsToProject: jest.fn(),
    getQuestionsForProject: jest.fn(),
  };

  const mockProjectTeamService = {
    assignUserToProject: jest.fn(),
    getProjectTeam: jest.fn(),
    updateProjectTeamMember: jest.fn(),
    removeUserFromProject: jest.fn(),
  };

  const mockPluginService = {
    installPlugin: jest.fn(),
    getInstalledPlugins: jest.fn(),
  };

  const mockSecretService = {
    setSecret: jest.fn(),
    getSecrets: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
        {
          provide: WorkflowConfigService,
          useValue: mockWorkflowConfigService,
        },
        {
          provide: AnnotationQuestionService,
          useValue: mockAnnotationQuestionService,
        },
        {
          provide: ProjectTeamService,
          useValue: mockProjectTeamService,
        },
        {
          provide: PluginService,
          useValue: mockPluginService,
        },
        {
          provide: SecretService,
          useValue: mockSecretService,
        },
      ],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
    projectService = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /projects', () => {
    it('should return list of projects', async () => {
      const mockProjects = [mockProject];
      mockProjectService.listProjects.mockResolvedValue(mockProjects);

      const result = await controller.listProjects();

      expect(result).toEqual(mockProjects);
      expect(mockProjectService.listProjects).toHaveBeenCalled();
    });

    it('should filter projects by query parameters', async () => {
      const mockProjects = [mockProject];
      mockProjectService.listProjects.mockResolvedValue(mockProjects);

      const result = await controller.listProjects('customer-123', 'ACTIVE', '1', '10');

      expect(result).toEqual(mockProjects);
      expect(mockProjectService.listProjects).toHaveBeenCalledWith({
        customerId: 'customer-123',
        status: 'ACTIVE',
        page: 1,
        pageSize: 10,
      });
    });
  });

  describe('GET /projects/:id', () => {
    it('should return project by id', async () => {
      mockProjectService.getProject.mockResolvedValue(mockProject);

      const result = await controller.getProject('project-123');

      expect(result).toEqual(mockProject);
      expect(mockProjectService.getProject).toHaveBeenCalledWith('project-123');
    });
  });

  describe('POST /projects', () => {
    it('should create new project', async () => {
      const createDto = {
        name: 'New Project',
        description: 'New Description',
        customerId: 'customer-123',
        projectType: 'TEXT',
        createdBy: 'user-123',
      };

      mockProjectService.createProject.mockResolvedValue(mockProject);

      const result = await controller.createProject(createDto);

      expect(result).toEqual(mockProject);
      expect(mockProjectService.createProject).toHaveBeenCalledWith(createDto);
    });
  });

  describe('PUT /projects/:id', () => {
    it('should update project', async () => {
      const updateDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      };

      const updatedProject = { ...mockProject, ...updateDto };
      mockProjectService.updateProject.mockResolvedValue(updatedProject);

      const result = await controller.updateProject('project-123', updateDto);

      expect(result).toEqual(updatedProject);
      expect(mockProjectService.updateProject).toHaveBeenCalledWith('project-123', updateDto);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should delete project', async () => {
      mockProjectService.deleteProject.mockResolvedValue(undefined);

      await expect(controller.deleteProject('project-123')).resolves.not.toThrow();
      expect(mockProjectService.deleteProject).toHaveBeenCalledWith('project-123');
    });
  });

  describe('GET /projects/:id/statistics', () => {
    it('should return project statistics', async () => {
      const mockStats = {
        totalTasks: 100,
        completedTasks: 80,
        pendingTasks: 20,
      };

      mockProjectService.getProjectStatistics.mockResolvedValue(mockStats);

      const result = await controller.getProjectStatistics('project-123');

      expect(result).toEqual(mockStats);
      expect(mockProjectService.getProjectStatistics).toHaveBeenCalledWith('project-123');
    });
  });

  describe('POST /projects/:id/supported-file-types', () => {
    it('should set supported file types', async () => {
      const fileTypes = ['CSV', 'TXT', 'IMAGE'];
      const updatedProject = { ...mockProject, supportedFileTypes: fileTypes };

      mockProjectService.setSupportedFileTypes.mockResolvedValue(updatedProject);

      const result = await controller.setSupportedFileTypes('project-123', fileTypes);

      expect(result).toEqual(updatedProject);
      expect(mockProjectService.setSupportedFileTypes).toHaveBeenCalledWith('project-123', fileTypes);
    });
  });

  describe('GET /projects/:id/supported-file-types', () => {
    it('should return supported file types', async () => {
      const fileTypes = ['.jpg', '.png', '.pdf'];

      mockProjectService.getSupportedFileTypes.mockResolvedValue(fileTypes);

      const result = await controller.getSupportedFileTypes('project-123');

      expect(result).toEqual(fileTypes);
      expect(mockProjectService.getSupportedFileTypes).toHaveBeenCalledWith('project-123');
    });
  });

  describe('POST /projects/:id/clone', () => {
    it('should clone project', async () => {
      const cloneDto = { newName: 'Cloned Project' };
      const clonedProject = { ...mockProject, name: 'Cloned Project' };

      mockProjectService.cloneProject.mockResolvedValue(clonedProject);

      const result = await controller.cloneProject('project-123', cloneDto);

      expect(result).toEqual(clonedProject);
      expect(mockProjectService.cloneProject).toHaveBeenCalledWith('project-123', cloneDto);
    });
  });
});