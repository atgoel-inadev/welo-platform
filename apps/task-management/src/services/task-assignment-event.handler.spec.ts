import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskAssignmentEventHandler } from './task-assignment-event.handler';
import { Task, Assignment, ProjectTeamMember } from '@app/common/entities';
import { AssignmentStatus, WorkflowStage, AssignmentMethod, UserStatus } from '@app/common/enums';
import { KafkaService } from '@app/infrastructure';
import { EachMessagePayload } from 'kafkajs';

describe('TaskAssignmentEventHandler', () => {
  let handler: TaskAssignmentEventHandler;
  let taskRepository: Repository<Task>;
  let assignmentRepository: Repository<Assignment>;
  let teamMemberRepository: Repository<ProjectTeamMember>;
  let kafkaService: KafkaService;

  const mockTeamMembers = [
    {
      projectId: 'project-123',
      userId: 'user-1',
      role: 'REVIEWER',
      isActive: true,
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
      },
    },
    {
      projectId: 'project-123',
      userId: 'user-2',
      role: 'REVIEWER',
      isActive: true,
      user: {
        id: 'user-2',
        status: UserStatus.ACTIVE,
      },
    },
  ] as ProjectTeamMember[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAssignmentEventHandler,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: {
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectTeamMember),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: KafkaService,
          useValue: {
            subscribe: jest.fn(),
            publishTaskEvent: jest.fn().mockResolvedValue(undefined),
            publishNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    handler = module.get<TaskAssignmentEventHandler>(TaskAssignmentEventHandler);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    assignmentRepository = module.get<Repository<Assignment>>(getRepositoryToken(Assignment));
    teamMemberRepository = module.get<Repository<ProjectTeamMember>>(
      getRepositoryToken(ProjectTeamMember),
    );
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should subscribe to state.transitioned events', async () => {
      // Arrange
      const subscribeSpy = jest.spyOn(kafkaService, 'subscribe');

      // Act
      await handler.onModuleInit();

      // Assert
      expect(subscribeSpy).toHaveBeenCalledWith('state.transitioned', expect.any(Function));
    });
  });

  describe('Event Handling - state.transitioned', () => {
    it('should create assignment when auto-assign enabled', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              taskId: 'task-123',
              projectId: 'project-123',
              fromStage: { id: 'stage_annotation', name: 'Annotation', type: 'annotation' },
              toStage: {
                id: 'stage_review',
                name: 'Review',
                type: 'review',
                autoAssign: true,
                requiredUsers: 1,
              },
              isCompleted: false,
            }),
          ),
        },
      } as EachMessagePayload;

      jest.spyOn(teamMemberRepository, 'find').mockResolvedValue(mockTeamMembers);
      jest.spyOn(assignmentRepository, 'count').mockResolvedValue(1);
      jest.spyOn(assignmentRepository, 'create').mockReturnValue({
        id: 'assignment-123',
        taskId: 'task-123',
        userId: 'user-1',
      } as any);
      jest.spyOn(assignmentRepository, 'save').mockResolvedValue({} as any);

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'state.transitioned') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act
      await capturedHandler!(mockPayload);

      // Assert
      expect(teamMemberRepository.find).toHaveBeenCalledWith({
        where: {
          projectId: 'project-123',
          role: 'REVIEWER',
          isActive: true,
        },
        relations: ['user'],
      });
      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-123',
          userId: 'user-1',
          workflowStage: WorkflowStage.REVIEW,
          status: AssignmentStatus.ASSIGNED,
          assignmentMethod: AssignmentMethod.AUTOMATIC,
        }),
      );
      expect(assignmentRepository.save).toHaveBeenCalled();
      expect(kafkaService.publishTaskEvent).toHaveBeenCalledWith('assigned', expect.any(Object));
      expect(kafkaService.publishNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'TASK_ASSIGNED',
        }),
      );
    });

    it('should not create assignment when auto-assign disabled', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              taskId: 'task-123',
              projectId: 'project-123',
              toStage: {
                id: 'stage_review',
                name: 'Review',
                type: 'review',
                autoAssign: false, // Disabled
                requiredUsers: 1,
              },
              isCompleted: false,
            }),
          ),
        },
      } as EachMessagePayload;

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'state.transitioned') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act
      await capturedHandler!(mockPayload);

      // Assert
      expect(teamMemberRepository.find).not.toHaveBeenCalled();
      expect(assignmentRepository.create).not.toHaveBeenCalled();
      expect(kafkaService.publishTaskEvent).not.toHaveBeenCalled();
    });

    it('should not create assignment when workflow completed', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              taskId: 'task-123',
              isCompleted: true, // Workflow completed
            }),
          ),
        },
      } as EachMessagePayload;

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'state.transitioned') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act
      await capturedHandler!(mockPayload);

      // Assert
      expect(teamMemberRepository.find).not.toHaveBeenCalled();
      expect(assignmentRepository.create).not.toHaveBeenCalled();
    });

    it('should handle multiple required users', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              taskId: 'task-123',
              projectId: 'project-123',
              toStage: {
                id: 'stage_review',
                name: 'Review',
                type: 'review',
                autoAssign: true,
                requiredUsers: 2, // Need 2 reviewers
              },
              isCompleted: false,
            }),
          ),
        },
      } as EachMessagePayload;

      jest.spyOn(teamMemberRepository, 'find').mockResolvedValue(mockTeamMembers);
      jest.spyOn(assignmentRepository, 'count').mockResolvedValue(1);
      jest.spyOn(assignmentRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(assignmentRepository, 'save').mockResolvedValue({} as any);

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'state.transitioned') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act
      await capturedHandler!(mockPayload);

      // Assert
      expect(assignmentRepository.create).toHaveBeenCalledTimes(2);
      expect(assignmentRepository.save).toHaveBeenCalledTimes(2);
      expect(kafkaService.publishTaskEvent).toHaveBeenCalledTimes(2);
      expect(kafkaService.publishNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle no eligible users gracefully', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              taskId: 'task-123',
              projectId: 'project-123',
              toStage: {
                id: 'stage_review',
                name: 'Review',
                type: 'review',
                autoAssign: true,
                requiredUsers: 1,
              },
              isCompleted: false,
            }),
          ),
        },
      } as EachMessagePayload;

      jest.spyOn(teamMemberRepository, 'find').mockResolvedValue([]); // No eligible users

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'state.transitioned') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act & Assert - should not throw
      await expect(capturedHandler!(mockPayload)).resolves.not.toThrow();
      expect(assignmentRepository.create).not.toHaveBeenCalled();
    });

    it('should use allowed users when specified', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              taskId: 'task-123',
              projectId: 'project-123',
              toStage: {
                id: 'stage_review',
                name: 'Review',
                type: 'review',
                autoAssign: true,
                requiredUsers: 1,
                allowedUsers: ['user-specific'],
              },
              isCompleted: false,
            }),
          ),
        },
      } as EachMessagePayload;

      jest.spyOn(assignmentRepository, 'count').mockResolvedValue(1);
      jest.spyOn(assignmentRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(assignmentRepository, 'save').mockResolvedValue({} as any);

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'state.transitioned') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act
      await capturedHandler!(mockPayload);

      // Assert
      expect(teamMemberRepository.find).not.toHaveBeenCalled(); // Should use allowedUsers instead
      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-specific',
        }),
      );
    });

    it('should handle assignment creation errors gracefully', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              taskId: 'task-123',
              projectId: 'project-123',
              toStage: {
                id: 'stage_review',
                name: 'Review',
                type: 'review',
                autoAssign: true,
                requiredUsers: 1,
              },
              isCompleted: false,
            }),
          ),
        },
      } as EachMessagePayload;

      jest.spyOn(teamMemberRepository, 'find').mockResolvedValue(mockTeamMembers);
      jest.spyOn(assignmentRepository, 'count').mockResolvedValue(1);
      jest.spyOn(assignmentRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(assignmentRepository, 'save').mockRejectedValue(new Error('Database error'));

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'state.transitioned') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act & Assert - should not throw, error should be logged
      await expect(capturedHandler!(mockPayload)).resolves.not.toThrow();
    });
  });

  describe('Stage Type Mapping', () => {
    it('should map annotation stage to ANNOTATION workflow stage', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              taskId: 'task-123',
              projectId: 'project-123',
              toStage: {
                id: 'stage_annotation',
                name: 'Annotation',
                type: 'annotation',
                autoAssign: true,
                requiredUsers: 1,
              },
              isCompleted: false,
            }),
          ),
        },
      } as EachMessagePayload;

      const annotators = [
        {
          ...mockTeamMembers[0],
          role: 'ANNOTATOR',
        },
      ] as ProjectTeamMember[];

      jest.spyOn(teamMemberRepository, 'find').mockResolvedValue(annotators);
      jest.spyOn(assignmentRepository, 'count').mockResolvedValue(0);
      jest.spyOn(assignmentRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(assignmentRepository, 'save').mockResolvedValue({} as any);

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'state.transitioned') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act
      await capturedHandler!(mockPayload);

      // Assert
      expect(teamMemberRepository.find).toHaveBeenCalledWith({
        where: {
          projectId: 'project-123',
          role: 'ANNOTATOR', // Should look for annotators
          isActive: true,
        },
        relations: ['user'],
      });
      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowStage: WorkflowStage.ANNOTATION,
        }),
      );
    });
  });
});
