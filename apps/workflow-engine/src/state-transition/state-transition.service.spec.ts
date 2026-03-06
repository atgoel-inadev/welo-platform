import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StateTransitionService } from './state-transition.service';
import { Task, Project, Assignment } from '@app/common/entities';
import { TaskStatus, AssignmentStatus, WorkflowStage } from '@app/common/enums';
import { KafkaService } from '@app/infrastructure';

describe('StateTransitionService', () => {
  let service: StateTransitionService;
  let taskRepository: Repository<Task>;
  let projectRepository: Repository<Project>;
  let assignmentRepository: Repository<Assignment>;
  let kafkaService: KafkaService;

  const mockTask = {
    id: 'task-123',
    status: TaskStatus.SUBMITTED,
    projectId: 'project-123',
    batchId: 'batch-123',
    machineState: {
      value: 'in_annotation',
      context: {
        currentStage: 'stage_annotation',
        taskId: 'task-123',
        projectId: 'project-123',
      },
    },
    project: {
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
            {
              id: 'stage_review',
              name: 'Review',
              type: 'review',
              reviewers_count: 1,
              auto_assign: true,
            },
          ],
        },
      },
    },
  } as any;

  const mockAssignments = [
    {
      id: 'assignment-1',
      taskId: 'task-123',
      userId: 'user-1',
      workflowStage: WorkflowStage.ANNOTATION,
      status: AssignmentStatus.COMPLETED,
    },
  ] as Assignment[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StateTransitionService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: KafkaService,
          useValue: {
            publishEvent: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<StateTransitionService>(StateTransitionService);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    assignmentRepository = module.get<Repository<Assignment>>(getRepositoryToken(Assignment));
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processAnnotationSubmitted', () => {
    it('should process annotation submission and transition to next stage', async () => {
      // Arrange
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest.spyOn(assignmentRepository, 'find').mockResolvedValue(mockAssignments);
      jest.spyOn(taskRepository, 'save').mockResolvedValue({
        ...mockTask,
        machineState: {
          value: 'in_review',
          context: {
            currentStage: 'stage_review',
            previousStage: 'stage_annotation',
          },
        },
      } as any);

      // Act
      await service.processAnnotationSubmitted('task-123');

      // Assert
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        relations: ['project'],
      });
      expect(assignmentRepository.find).toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalled();
      expect(kafkaService.publishEvent).toHaveBeenCalledWith(
        'state.transitioned',
        expect.objectContaining({
          taskId: 'task-123',
          fromStage: expect.objectContaining({
            id: 'stage_annotation',
            name: 'Annotation',
          }),
          toStage: expect.objectContaining({
            id: 'stage_review',
            name: 'Review',
          }),
        }),
      );
    });

    it('should not transition if task not found', async () => {
      // Arrange
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(null);

      // Act
      await service.processAnnotationSubmitted('task-123');

      // Assert
      expect(taskRepository.findOne).toHaveBeenCalled();
      expect(assignmentRepository.find).not.toHaveBeenCalled();
      expect(kafkaService.publishEvent).not.toHaveBeenCalled();
    });

    it('should not transition if workflow configuration is missing', async () => {
      // Arrange
      const taskWithoutWorkflow = {
        ...mockTask,
        project: {
          ...mockTask.project,
          configuration: {},
        },
      };
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(taskWithoutWorkflow as any);

      // Act
      await service.processAnnotationSubmitted('task-123');

      // Assert
      expect(taskRepository.findOne).toHaveBeenCalled();
      expect(assignmentRepository.find).not.toHaveBeenCalled();
      expect(kafkaService.publishEvent).not.toHaveBeenCalled();
    });

    it('should not transition if assignments not completed', async () => {
      // Arrange
      const incompleteAssignments = [
        {
          ...mockAssignments[0],
          status: AssignmentStatus.IN_PROGRESS,
        },
      ];
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest.spyOn(assignmentRepository, 'find').mockResolvedValue(incompleteAssignments as any);

      // Act
      await service.processAnnotationSubmitted('task-123');

      // Assert
      expect(taskRepository.findOne).toHaveBeenCalled();
      expect(assignmentRepository.find).toHaveBeenCalled();
      expect(taskRepository.save).not.toHaveBeenCalled();
      expect(kafkaService.publishEvent).not.toHaveBeenCalled();
    });

    it('should complete task when no more stages', async () => {
      // Arrange
      const taskAtFinalStage = {
        ...mockTask,
        machineState: {
          value: 'in_review',
          context: {
            currentStage: 'stage_review',
          },
        },
      };
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(taskAtFinalStage as any);
      jest.spyOn(assignmentRepository, 'find').mockResolvedValue(mockAssignments);
      jest.spyOn(taskRepository, 'save').mockResolvedValue({
        ...taskAtFinalStage,
        status: TaskStatus.APPROVED,
        machineState: {
          value: 'completed',
          done: true,
        },
      } as any);

      // Act
      await service.processAnnotationSubmitted('task-123');

      // Assert
      expect(taskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TaskStatus.APPROVED,
          machineState: expect.objectContaining({
            value: 'completed',
            done: true,
          }),
        }),
      );
      expect(kafkaService.publishEvent).toHaveBeenCalledWith(
        'state.transitioned',
        expect.objectContaining({
          isCompleted: true,
        }),
      );
    });

    it('should handle multiple required assignments correctly', async () => {
      // Arrange
      const multiAnnotatorTask = {
        ...mockTask,
        project: {
          ...mockTask.project,
          configuration: {
            workflowConfiguration: {
              stages: [
                {
                  id: 'stage_annotation',
                  name: 'Annotation',
                  type: 'annotation',
                  annotators_count: 2, // Require 2 annotators
                  auto_assign: true,
                },
                {
                  id: 'stage_review',
                  name: 'Review',
                  type: 'review',
                  reviewers_count: 1,
                  auto_assign: true,
                },
              ],
            },
          },
        },
      };
      const twoCompletedAssignments = [
        { ...mockAssignments[0], status: AssignmentStatus.COMPLETED },
        { ...mockAssignments[0], id: 'assignment-2', status: AssignmentStatus.COMPLETED },
      ];

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(multiAnnotatorTask as any);
      jest.spyOn(assignmentRepository, 'find').mockResolvedValue(twoCompletedAssignments as any);
      jest.spyOn(taskRepository, 'save').mockResolvedValue({} as any);

      // Act
      await service.processAnnotationSubmitted('task-123');

      // Assert
      expect(assignmentRepository.find).toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalled();
      expect(kafkaService.publishEvent).toHaveBeenCalled();
    });
  });

  describe('State Transition Event Publishing', () => {
    it('should publish correct event structure for state transition', async () => {
      // Arrange
      const taskInReview = {
        ...mockTask,
        machineState: {
          value: 'in_review',
          context: {
            currentStage: 'stage_review',
            previousStage: 'stage_annotation',
            taskId: 'task-123',
            projectId: 'project-123',
          },
        },
      };
      const reviewAssignments = [
        {
          id: 'assignment-review',
          taskId: 'task-123',
          userId: 'reviewer-1',
          workflowStage: WorkflowStage.REVIEW,
          status: AssignmentStatus.IN_PROGRESS, // Not completed yet
        },
      ];

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(taskInReview as any);
      jest.spyOn(assignmentRepository, 'find').mockResolvedValue(reviewAssignments as any);
      jest.spyOn(taskRepository, 'save').mockResolvedValue(taskInReview as any);

      // Act
      await service.processAnnotationSubmitted('task-123');

      // Assert - Should not publish event since assignments not completed
      expect(kafkaService.publishEvent).not.toHaveBeenCalled();
    });
  });
});
