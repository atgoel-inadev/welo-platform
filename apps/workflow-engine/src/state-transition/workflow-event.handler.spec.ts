import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEventHandler } from './workflow-event.handler';
import { StateTransitionService } from './state-transition.service';
import { KafkaService } from '@app/infrastructure';
import { EachMessagePayload } from 'kafkajs';

describe('WorkflowEventHandler', () => {
  let handler: WorkflowEventHandler;
  let stateTransitionService: StateTransitionService;
  let kafkaService: KafkaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEventHandler,
        {
          provide: StateTransitionService,
          useValue: {
            processAnnotationSubmitted: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: KafkaService,
          useValue: {
            subscribe: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<WorkflowEventHandler>(WorkflowEventHandler);
    stateTransitionService = module.get<StateTransitionService>(StateTransitionService);
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should subscribe to annotation.submitted events', async () => {
      // Arrange
      const subscribeSpy = jest.spyOn(kafkaService, 'subscribe');

      // Act
      await handler.onModuleInit();

      // Assert
      expect(subscribeSpy).toHaveBeenCalledWith('annotation.submitted', expect.any(Function));
      expect(subscribeSpy).toHaveBeenCalledWith('quality_check.completed', expect.any(Function));
    });
  });

  describe('Event Handling', () => {
    it('should process annotation.submitted event with taskId in message', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              taskId: 'task-123',
              userId: 'user-456',
            }),
          ),
        },
      } as EachMessagePayload;

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'annotation.submitted') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act
      await capturedHandler!(mockPayload);

      // Assert
      expect(stateTransitionService.processAnnotationSubmitted).toHaveBeenCalledWith('task-123');
    });

    it('should process annotation.submitted event with taskId in data', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              data: {
                taskId: 'task-789',
              },
            }),
          ),
        },
      } as EachMessagePayload;

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'annotation.submitted') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act
      await capturedHandler!(mockPayload);

      // Assert
      expect(stateTransitionService.processAnnotationSubmitted).toHaveBeenCalledWith('task-789');
    });

    it('should not process annotation.submitted event without taskId', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              userId: 'user-456',
            }),
          ),
        },
      } as EachMessagePayload;

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'annotation.submitted') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act
      await capturedHandler!(mockPayload);

      // Assert
      expect(stateTransitionService.processAnnotationSubmitted).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from('invalid json'),
        },
      } as EachMessagePayload;

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'annotation.submitted') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act & Assert - should not throw
      await expect(capturedHandler!(mockPayload)).resolves.not.toThrow();
      expect(stateTransitionService.processAnnotationSubmitted).not.toHaveBeenCalled();
    });

    it('should handle service errors without crashing', async () => {
      // Arrange
      const mockPayload = {
        message: {
          value: Buffer.from(
            JSON.stringify({
              taskId: 'task-123',
            }),
          ),
        },
      } as EachMessagePayload;

      jest
        .spyOn(stateTransitionService, 'processAnnotationSubmitted')
        .mockRejectedValue(new Error('Service error'));

      let capturedHandler: (payload: EachMessagePayload) => Promise<void>;
      jest.spyOn(kafkaService, 'subscribe').mockImplementation(async (topic, handler) => {
        if (topic === 'annotation.submitted') {
          capturedHandler = handler;
        }
      });

      await handler.onModuleInit();

      // Act & Assert - should not throw
      await expect(capturedHandler!(mockPayload)).resolves.not.toThrow();
    });
  });
});
