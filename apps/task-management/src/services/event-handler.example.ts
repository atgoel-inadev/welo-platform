/**
 * Example: Event Handler - Updated to use IMessagingService
 * 
 * This demonstrates how to update event subscription from KafkaService to IMessagingService
 */

import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';

// ── UPDATED: Import messaging abstraction ────────────────────────────────────
import { IMessagingService, MESSAGING_SERVICE, MessagePayload } from '@app/infrastructure';

import { TaskService } from './task.service';

@Injectable()
export class TaskAssignmentEventHandler implements OnModuleInit {
  private readonly logger = new Logger(TaskAssignmentEventHandler.name);

  constructor(
    // ── UPDATED: Use IMessagingService with injection token ────────────────────
    @Inject(MESSAGING_SERVICE)
    private messagingService: IMessagingService,
    
    private taskService: TaskService,
  ) {}

  /**
   * Subscribe to events on module initialization
   */
  async onModuleInit() {
    // ── UPDATED: New handler signature with MessagePayload ──────────────────────
    await this.messagingService.subscribe(
      'annotation.submitted',
      async (payload: MessagePayload) => {
        this.logger.log('Received annotation.submitted event', {
          messageId: payload.metadata?.messageId,
          correlationId: payload.metadata?.correlationId,
          traceId: payload.metadata?.traceId,
        });

        // ── UPDATED: Use payload.value directly (already parsed) ────────────────
        const annotation = payload.value;
        await this.handleAnnotationSubmitted(annotation);
      },
    );

    // Subscribe to multiple events
    await this.messagingService.subscribe(
      'quality_check.completed',
      async (payload: MessagePayload) => {
        this.logger.log('Received quality_check.completed event', {
          messageId: payload.metadata?.messageId,
          correlationId: payload.metadata?.correlationId,
        });

        const qualityCheck = payload.value;
        await this.handleQualityCheckCompleted(qualityCheck);
      },
    );

    // Subscribe to state transitions from workflow engine
    await this.messagingService.subscribe(
      'state.transitioned',
      async (payload: MessagePayload) => {
        const transition = payload.value;
        
        // Extract metadata for tracing
        const { messageId, correlationId, traceId } = payload.metadata || {};
        
        this.logger.log('State transition received', {
          messageId,
          correlationId,
          traceId,
          taskId: transition.payload?.taskId,
          fromState: transition.payload?.fromState,
          toState: transition.payload?.toState,
        });

        await this.handleStateTransition(transition);
      },
    );
  }

  /**
   * Handle annotation submission
   */
  private async handleAnnotationSubmitted(annotation: any): Promise<void> {
    // Process annotation
    this.logger.log(`Processing annotation for task ${annotation.taskId}`);
    
    // Update task status
    await this.taskService.updateTaskStatus(annotation.taskId, 'under_review');
    
    // Publish follow-up event
    await this.messagingService.publishEvent(
      'task.review_requested',
      { taskId: annotation.taskId, annotationId: annotation.id },
      'task-management-service',
      annotation.correlationId,
    );
  }

  /**
   * Handle quality check completion
   */
  private async handleQualityCheckCompleted(qualityCheck: any): Promise<void> {
    this.logger.log(`Quality check completed for task ${qualityCheck.taskId}`);
    
    if (qualityCheck.passed) {
      await this.taskService.updateTaskStatus(qualityCheck.taskId, 'approved');
      
      await this.messagingService.publishTaskEvent('approved', {
        id: qualityCheck.taskId,
        qualityScore: qualityCheck.score,
      });
    } else {
      await this.taskService.updateTaskStatus(qualityCheck.taskId, 'rejected');
      
      await this.messagingService.publishTaskEvent('rejected', {
        id: qualityCheck.taskId,
        reason: qualityCheck.failureReason,
      });
    }
  }

  /**
   * Handle state transition from workflow engine
   */
  private async handleStateTransition(transition: any): Promise<void> {
    const { taskId, fromState, toState } = transition.payload;
    
    this.logger.log(`Task ${taskId} transitioned from ${fromState} to ${toState}`);
    
    // Perform state-specific actions
    if (toState === 'completed') {
      await this.taskService.finalizeTask(taskId);
    }
  }
}
