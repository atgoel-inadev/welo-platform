import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { IMessagingService, MESSAGING_SERVICE, MessagePayload } from '@app/infrastructure';
import { StateTransitionService } from './state-transition.service';

/**
 * Workflow Event Handler
 * Subscribes to workflow-related Kafka events and triggers state transitions
 * 
 * Events consumed:
 * - annotation.submitted: Triggers workflow progression check
 * - quality_check.completed: May trigger state transitions based on QC results
 */
@Injectable()
export class WorkflowEventHandler implements OnModuleInit {
  private readonly logger = new Logger(WorkflowEventHandler.name);

  constructor(
    @Inject(MESSAGING_SERVICE)
    private messagingService: IMessagingService,
    private stateTransitionService: StateTransitionService,
  ) {}

  async onModuleInit() {
    await this.subscribeToEvents();
  }

  private async subscribeToEvents() {
    // Subscribe to annotation.submitted events
    await this.messagingService.subscribe('annotation.submitted', async (payload: MessagePayload) => {
      try {
        const message = payload.value;
        this.logger.log(`[Event Received] annotation.submitted for task ${message.taskId || message.data?.taskId}`);
        
        const taskId = message.taskId || message.data?.taskId;
        
        if (!taskId) {
          this.logger.error('[Error] annotation.submitted event missing taskId');
          return;
        }

        // Trigger state transition
        await this.stateTransitionService.processAnnotationSubmitted(taskId);
      } catch (error) {
        this.logger.error(`[Error] Failed to process annotation.submitted event: ${error.message}`, error.stack);
      }
    });

    // Subscribe to quality_check.completed events (for future enhancement)
    await this.messagingService.subscribe('quality_check.completed', async (payload: MessagePayload) => {
      try {
        const message = payload.value;
        this.logger.log(`[Event Received] quality_check.completed for task ${message.taskId || message.data?.taskId}`);
        
        // Future: Implement quality gate logic
        // If QC failed, may need to transition back to annotation stage
      } catch (error) {
        this.logger.error(`[Error] Failed to process quality_check.completed event: ${error.message}`, error.stack);
      }
    });

    this.logger.log('[Workflow Engine] Event subscriptions initialized');
  }
}
