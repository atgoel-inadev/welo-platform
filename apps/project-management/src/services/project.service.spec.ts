import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectService } from './project.service';
import { Project, Task } from '@app/common/entities';
import { ProjectStatus, ProjectType, TaskStatus, TaskType } from '@app/common/enums';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: Repository<Project>;
  let taskRepository: Repository<Task>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    description: 'Test Description',
    customerId: 'customer-123',
    projectType: ProjectType.TEXT,
    status: ProjectStatus.ACTIVE,
    defaultWorkflowId: 'workflow-123',
    createdBy: 'user-123',
    startDate: new Date(),
    endDate: new Date(),
    configuration: {
      annotationSchema: {},
      qualityThresholds: {},
      workflowRules: {},
      uiConfiguration: {},
      annotationQuestions: [],
      workflowConfiguration: {
        annotatorsPerTask: 1,
        reviewLevels: [],
        approvalCriteria: {
          requireAllAnnotatorConsensus: false,
        },
        assignmentRules: {
          allowSelfAssignment: true,
          preventDuplicateAssignments: true,
        },
        stages: [],
      },
      supportedFileTypes: ['PDF' as const, 'TXT' as const],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockTask = {
    id: 'task-123',
    batchId: 'batch-123',
    projectId: 'project-123',
    workflowId: 'workflow-123',
    externalId: 'ext-123',
    taskType: TaskType.ANNOTATION,
    status: TaskStatus.APPROVED,
    priority: 5,
    machineState: {
      value: 'completed',
      context: {},
      done: true,
    },
    assignedAt: new Date(),
    dueDate: new Date(),
    stateUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            softRemove: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn(),
            count: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listProjects', () => {
    it('should return paginated projects without filters', async () => {
      const mockProjects = [mockProject];
      const mockTotal = 1;

      jest.spyOn(projectRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockProjects, mockTotal]),
      } as any);

      const result = await service.listProjects({ page: 1, pageSize: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProjects);
      expect(result.pagination.totalItems).toBe(mockTotal);
    });

    it('should apply customerId filter', async () => {
      const mockProjects = [mockProject];
      const mockTotal = 1;

      const queryBuilderMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockProjects, mockTotal]),
      };

      jest.spyOn(projectRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      await service.listProjects({
        customerId: 'customer-123',
        page: 1,
        pageSize: 10
      });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'project.customerId = :customerId',
        { customerId: 'customer-123' }
      );
    });

    it('should apply status filter', async () => {
      const mockProjects = [mockProject];
      const mockTotal = 1;

      const queryBuilderMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockProjects, mockTotal]),
      };

      jest.spyOn(projectRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      await service.listProjects({
        status: ProjectStatus.ACTIVE,
        page: 1,
        pageSize: 10
      });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'project.status = :status',
        { status: ProjectStatus.ACTIVE }
      );
    });

    it('should apply pagination correctly', async () => {
      const mockProjects = [mockProject];
      const mockTotal = 25;

      const queryBuilderMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockProjects, mockTotal]),
      };

      jest.spyOn(projectRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      await service.listProjects({
        page: 2,
        pageSize: 10
      });

      expect(queryBuilderMock.skip).toHaveBeenCalledWith(10);
      expect(queryBuilderMock.take).toHaveBeenCalledWith(10);
    });

    it('should handle empty results', async () => {
      const queryBuilderMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest.spyOn(projectRepository, 'createQueryBuilder').mockReturnValue(queryBuilderMock as any);

      const result = await service.listProjects({ page: 1, pageSize: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrevious).toBe(false);
    });
  });

  describe('getProject', () => {
    it('should return project when found', async () => {
      const mockStats = {
        totalTasks: 10,
        completedTasks: 7,
        inProgressTasks: 2,
        queuedTasks: 1,
        completionRate: 70,
        averageQualityScore: 85,
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(service, 'getProjectStatistics').mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await service.getProject('project-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...mockProject,
        statistics: mockStats,
      });
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        relations: ['customer', 'creator', 'defaultWorkflow'],
      });
      expect(service.getProjectStatistics).toHaveBeenCalledWith('project-123');
    });

    it('should throw NotFoundException when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getProject('non-existent')).rejects.toThrow('Project with ID non-existent not found');
    });
  });

  describe('createProject', () => {
    it('should create and return new project', async () => {
      const createDto = {
        name: 'New Project',
        customerId: 'customer-123',
        projectType: ProjectType.TEXT,
        createdBy: 'user-123',
        description: 'Test Description',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-06-30'),
        annotationSchema: [{ id: 'q1', question: 'Test?', questionType: 'TEXT' as const, required: true }],
        qualityThresholds: { minScore: 70 },
        workflowRules: { autoAssign: true },
        uiConfiguration: { theme: 'dark' },
        supportedFileTypes: ['PDF' as const, 'TXT' as const],
        workflow_config: {
          stages: [
            {
              id: 'stage_annotation',
              name: 'Annotation',
              type: 'annotation' as const,
              annotators_count: 2,
              auto_assign: true,
            },
          ],
        },
      };

      const createdProject = {
        ...mockProject,
        name: createDto.name,
        customerId: createDto.customerId,
        projectType: createDto.projectType,
        createdBy: createDto.createdBy,
        description: createDto.description,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        status: ProjectStatus.DRAFT,
        configuration: {
          annotationSchema: createDto.annotationSchema,
          qualityThresholds: createDto.qualityThresholds,
          workflowRules: createDto.workflowRules,
          uiConfiguration: createDto.uiConfiguration,
          annotationQuestions: createDto.annotationSchema,
          workflowConfiguration: {
            stages: createDto.workflow_config.stages,
            annotatorsPerTask: 2,
            reviewLevels: [],
            approvalCriteria: {
              requireAllAnnotatorConsensus: false,
            },
            assignmentRules: {
              allowSelfAssignment: true,
              preventDuplicateAssignments: true,
            },
            global_max_rework_before_reassignment: 3,
            enable_quality_gates: false,
            minimum_quality_score: 70,
          },
          supportedFileTypes: createDto.supportedFileTypes,
        },
      } as Project;

      jest.spyOn(projectRepository, 'create').mockReturnValue(createdProject as any);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(createdProject);

      const result = await service.createProject(createDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdProject);
      expect(projectRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        customerId: createDto.customerId,
        description: createDto.description,
        projectType: createDto.projectType,
        status: ProjectStatus.DRAFT,
        createdBy: createDto.createdBy,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        configuration: expect.objectContaining({
          annotationSchema: createDto.annotationSchema,
          workflowConfiguration: expect.objectContaining({
            stages: createDto.workflow_config.stages,
            annotatorsPerTask: 2,
          }),
          supportedFileTypes: createDto.supportedFileTypes,
        }),
      });
    });

    it('should handle project creation with minimal data', async () => {
      const createDto = {
        name: 'Minimal Project',
        customerId: 'customer-123',
        projectType: ProjectType.TEXT,
        createdBy: 'user-123',
      };

      const createdProject = {
        ...mockProject,
        ...createDto,
        status: ProjectStatus.DRAFT,
        configuration: {
          annotationSchema: [],
          qualityThresholds: {},
          workflowRules: {},
          uiConfiguration: {},
          annotationQuestions: [],
          workflowConfiguration: {
            annotatorsPerTask: 1,
            reviewLevels: [],
            approvalCriteria: {
              requireAllAnnotatorConsensus: false,
            },
            assignmentRules: {
              allowSelfAssignment: true,
              preventDuplicateAssignments: true,
            },
          },
          supportedFileTypes: [],
        },
      };

      jest.spyOn(projectRepository, 'create').mockReturnValue(createdProject as any);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(createdProject);

      const result = await service.createProject(createDto);

      expect(result.success).toBe(true);
      expect(result.data.configuration.workflowConfiguration.annotatorsPerTask).toBe(1);
    });

    it('should handle repository save failure', async () => {
      const createDto = {
        name: 'New Project',
        customerId: 'customer-123',
        projectType: ProjectType.TEXT,
        createdBy: 'user-123',
      };

      jest.spyOn(projectRepository, 'create').mockReturnValue(mockProject as any);
      jest.spyOn(projectRepository, 'save').mockRejectedValue(new Error('Database error'));

      await expect(service.createProject(createDto)).rejects.toThrow('Database error');
    });
  });

  describe('updateProject', () => {
    it('should update and return project', async () => {
      const updateDto = {
        name: 'Updated Project',
        description: 'Updated Description',
        status: ProjectStatus.ACTIVE,
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-12-31'),
      };

      const updatedProject = { ...mockProject, ...updateDto };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(updatedProject);

      const result = await service.updateProject('project-123', updateDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedProject);
      expect(projectRepository.save).toHaveBeenCalledWith({
        ...mockProject,
        ...updateDto,
        updatedAt: expect.any(Date),
      });
    });

    it('should update workflow configuration', async () => {
      const updateDto = {
        workflow_config: {
          stages: [
            {
              id: 'stage_review',
              name: 'Review',
              type: 'review' as const,
              annotators_count: 1,
              reviewers_count: 2,
              auto_assign: false,
            },
          ],
        },
      };

      const updatedProject = {
        ...mockProject,
        configuration: {
          ...mockProject.configuration,
          workflowConfiguration: {
            stages: updateDto.workflow_config.stages,
            annotatorsPerTask: 1,
            reviewLevels: [],
            approvalCriteria: {
              requireAllAnnotatorConsensus: false,
            },
            assignmentRules: {
              allowSelfAssignment: true,
              preventDuplicateAssignments: true,
            },
            global_max_rework_before_reassignment: 3,
            enable_quality_gates: false,
            minimum_quality_score: 70,
          },
        },
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(updatedProject);

      const result = await service.updateProject('project-123', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.configuration.workflowConfiguration).toBeDefined();
    });

    it('should handle partial updates', async () => {
      const updateDto = {
        description: 'Updated Description Only',
      };

      const updatedProject = { ...mockProject, ...updateDto };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(updatedProject);

      const result = await service.updateProject('project-123', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.description).toBe('Updated Description Only');
      expect(result.data.name).toBe(mockProject.name); // Unchanged
    });

    it('should update endDate when provided', async () => {
      const newEndDate = new Date('2025-12-31');
      const updateDto = {
        endDate: newEndDate,
      };

      const updatedProject = { ...mockProject, endDate: newEndDate };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(updatedProject);

      const result = await service.updateProject('project-123', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.endDate).toEqual(newEndDate);
      expect(projectRepository.save).toHaveBeenCalledWith({
        ...mockProject,
        endDate: newEndDate,
      });
    });

    it('should merge configuration when provided', async () => {
      const updateDto = {
        configuration: {
          uiConfiguration: { theme: 'dark' },
        },
      };

      const expectedConfiguration = {
        ...mockProject.configuration,
        ...updateDto.configuration,
      };

      const updatedProject = { ...mockProject, configuration: expectedConfiguration };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(updatedProject);

      const result = await service.updateProject('project-123', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.configuration).toEqual(expectedConfiguration);
      expect(projectRepository.save).toHaveBeenCalledWith({
        ...mockProject,
        configuration: expectedConfiguration,
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateProject('non-existent', {})).rejects.toThrow('Project with ID non-existent not found');
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'softRemove').mockResolvedValue(mockProject);

      const result = await service.deleteProject('project-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Project project-123 deleted successfully');
      expect(projectRepository.softRemove).toHaveBeenCalledWith(mockProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deleteProject('non-existent')).rejects.toThrow('Project with ID non-existent not found');
    });
  });

  describe('getProjectStatistics', () => {
    it('should return project statistics', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(taskRepository, 'count').mockImplementation((options: any) => {
        if (options.where.status === 'COMPLETED') return Promise.resolve(7);
        if (options.where.status === 'IN_PROGRESS') return Promise.resolve(2);
        if (options.where.status === 'QUEUED') return Promise.resolve(1);
        return Promise.resolve(10);
      });
      jest.spyOn(taskRepository, 'createQueryBuilder').mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgQuality: 85 }),
      } as any);

      const result = await service.getProjectStatistics('project-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalTasks: 10,
        completedTasks: 7,
        inProgressTasks: 2,
        queuedTasks: 1,
        completionRate: 70,
        averageQualityScore: 85,
      });
    });

    it('should return zero average quality score when no quality data', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(taskRepository, 'count').mockResolvedValue(5);
      jest.spyOn(taskRepository, 'createQueryBuilder').mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.getProjectStatistics('project-123');

      expect(result.data.averageQualityScore).toBe(0);
    });

    it('should return zero completion rate when no tasks exist', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(taskRepository, 'count').mockResolvedValue(0); // No tasks
      jest.spyOn(taskRepository, 'createQueryBuilder').mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          completedTasks: 0,
          averageQualityScore: 80,
        }),
      } as any);

      const result = await service.getProjectStatistics('project-123');

      expect(result.data.completionRate).toBe(0);
    });

    it('should throw NotFoundException when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getProjectStatistics('non-existent')).rejects.toThrow('Project with ID non-existent not found');
    });
  });

  describe('setSupportedFileTypes', () => {
    it('should set supported file types', async () => {
      const fileTypes = ['PDF' as const, 'TXT' as const, 'IMAGE' as const];
      const updatedProject = { ...mockProject, configuration: { ...mockProject.configuration, supportedFileTypes: fileTypes } };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(updatedProject);

      const result = await service.setSupportedFileTypes('project-123', fileTypes);

      expect(result.success).toBe(true);
      expect(result.data.supportedFileTypes).toEqual(fileTypes);
      expect(projectRepository.save).toHaveBeenCalledWith({
        ...mockProject,
        configuration: { ...mockProject.configuration, supportedFileTypes: fileTypes },
        updatedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.setSupportedFileTypes('non-existent', [])).rejects.toThrow('Project with ID non-existent not found');
    });
  });

  describe('getSupportedFileTypes', () => {
    it('should return supported file types', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      const result = await service.getSupportedFileTypes('project-123');

      expect(result.success).toBe(true);
      expect(result.data.supportedFileTypes).toEqual(mockProject.configuration.supportedFileTypes);
    });

    it('should return empty array when no file types configured', async () => {
      const projectWithoutFileTypes = { ...mockProject, configuration: { ...mockProject.configuration, supportedFileTypes: undefined } };
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(projectWithoutFileTypes);

      const result = await service.getSupportedFileTypes('project-123');

      expect(result.data.supportedFileTypes).toEqual([]);
    });

    it('should throw NotFoundException when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getSupportedFileTypes('non-existent')).rejects.toThrow('Project with ID non-existent not found');
    });
  });

  describe('cloneProject', () => {
    it('should clone project successfully', async () => {
      const cloneData = { newName: 'Cloned Project', copyTasks: false };
      const clonedProject = {
        ...mockProject,
        id: 'new-project-id',
        name: cloneData.newName,
        status: ProjectStatus.DRAFT,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(projectRepository, 'create').mockReturnValue(clonedProject as any);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(clonedProject);
      jest.spyOn(projectRepository, 'findOne').mockResolvedValueOnce(mockProject).mockResolvedValueOnce({
        ...clonedProject,
        customer: mockProject.customer,
        creator: mockProject.creator,
      });

      const result = await service.cloneProject('project-123', cloneData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe(cloneData.newName);
      expect(result.data.status).toBe(ProjectStatus.DRAFT);
      expect(result.data.configuration).toEqual(mockProject.configuration);
      expect(result.message).toBe('Project cloned successfully');
    });

    it('should clone project with tasks when copyTasks is true', async () => {
      const cloneData = { newName: 'Cloned Project with Tasks', copyTasks: true };
      const clonedProject = {
        ...mockProject,
        id: 'cloned-project-123',
        name: cloneData.newName,
        status: ProjectStatus.DRAFT,
        configuration: mockProject.configuration,
      };

      jest.spyOn(projectRepository, 'create').mockReturnValue(clonedProject as any);
      jest.spyOn(projectRepository, 'save').mockResolvedValue(clonedProject);
      jest.spyOn(projectRepository, 'findOne').mockResolvedValueOnce(mockProject).mockResolvedValueOnce({
        ...clonedProject,
        customer: mockProject.customer,
        creator: mockProject.creator,
      });

      const result = await service.cloneProject('project-123', cloneData);

      expect(result.success).toBe(true);
      // Note: Task copying is not yet implemented (TODO in service)
    });

    it('should throw NotFoundException when project not found', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.cloneProject('non-existent', { newName: 'Test' })).rejects.toThrow('Project with ID non-existent not found');
    });

    it('should throw BadRequestException for invalid clone data', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      await expect(service.cloneProject('project-123', { newName: '' })).rejects.toThrow('New project name is required');
    });

    it('should throw BadRequestException for empty new name', async () => {
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);

      await expect(service.cloneProject('project-123', { newName: '   ' })).rejects.toThrow('New project name is required');
    });
  });

  describe('buildWorkflowConfiguration', () => {
    it('should return default configuration when no workflow config provided', () => {
      const result = (service as any).buildWorkflowConfiguration();

      expect(result).toEqual({
        annotatorsPerTask: 1,
        reviewLevels: [],
        approvalCriteria: {
          requireAllAnnotatorConsensus: false,
        },
        assignmentRules: {
          allowSelfAssignment: true,
          preventDuplicateAssignments: true,
        },
      });
    });

    it('should build configuration with stages', () => {
      const workflowConfig = {
        stages: [
          {
            id: 'stage_annotation',
            name: 'Annotation',
            type: 'annotation',
            annotators_count: 3,
            auto_assign: true,
          },
        ],
        global_max_rework_before_reassignment: 5,
        enable_quality_gates: true,
        minimum_quality_score: 80,
      };

      const result = (service as any).buildWorkflowConfiguration(workflowConfig);

      expect(result.stages).toEqual(workflowConfig.stages);
      expect(result.annotatorsPerTask).toBe(3);
      expect(result.global_max_rework_before_reassignment).toBe(5);
      expect(result.enable_quality_gates).toBe(true);
      expect(result.minimum_quality_score).toBe(80);
    });

    it('should maintain backward compatibility with review_levels', () => {
      const workflowConfig = {
        review_levels: [
          { level: 1, name: 'L1 Review', reviewersCount: 2 },
        ],
        annotatorsPerTask: 2,
        approvalCriteria: {
          requireAllAnnotatorConsensus: true,
        },
      };

      const result = (service as any).buildWorkflowConfiguration(workflowConfig);

      expect(result.annotatorsPerTask).toBe(2);
      expect(result.reviewLevels).toEqual(workflowConfig.review_levels);
      expect(result.approvalCriteria.requireAllAnnotatorConsensus).toBe(true);
    });

    it('should use stage annotators_count when available', () => {
      const workflowConfig = {
        stages: [
          {
            id: 'stage_annotation',
            name: 'Annotation',
            type: 'annotation',
            annotators_count: 5,
            auto_assign: true,
          },
        ],
        annotatorsPerTask: 2, // This should be overridden
      };

      const result = (service as any).buildWorkflowConfiguration(workflowConfig);

      expect(result.annotatorsPerTask).toBe(5);
    });

    it('should handle empty stages array', () => {
      const workflowConfig = {
        stages: [],
        annotatorsPerTask: 3,
      };

      const result = (service as any).buildWorkflowConfiguration(workflowConfig);

      expect(result.annotatorsPerTask).toBe(3);
      expect(result.stages).toEqual([]);
    });
  });
});