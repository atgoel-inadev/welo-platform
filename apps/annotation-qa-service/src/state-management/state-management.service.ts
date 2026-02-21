import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, Project } from '@app/common';
import { WorkflowEngineClient } from './workflow-engine.client';
import { KafkaService } from '../kafka/kafka.service';

export interface EvaluationResult {
  taskId: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'ESCALATE';
  stateEventSent: string;
  overallQualityScore: number;
  requeued: boolean;
  escalated: boolean;
  reason: string;
}

@Injectable()
export class StateManagementService {
  private readonly logger = new Logger(StateManagementService.name);
  private readonly maxAttempts = 3;

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly workflowClient: WorkflowEngineClient,
    private readonly kafkaService: KafkaService,
  ) {}

  /**
   * Send an XState event to the Workflow Engine for a task.
   * Used by QC and Review modules to drive state transitions.
   */
  async sendWorkflowEvent(
    taskId: string,
    eventType: string,
    payload: Record<string, any> = {},
  ): Promise<void> {
    await this.workflowClient.sendTaskEvent(taskId, eventType, payload);
  }

  /**
   * Evaluate a reviewer's decision and trigger the appropriate state transition.
   * Called by ReviewService after a review is submitted.
   */
  async evaluateReviewDecision(
    taskId: string,
    reviewDecision: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION',
    reviewScore: number,
    reviewerId: string,
    autoQcScore: number,
  ): Promise<EvaluationResult> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) {
      this.logger.warn(`Task ${taskId} not found during evaluation`);
      return this.buildResult(taskId, 'REJECT', 'REJECT', 0, false, false, 'Task not found');
    }

    const project = await this.projectRepo.findOne({ where: { id: task.projectId } });
    const minScore: number =
      (project?.configuration as any)?.quality_thresholds?.minimum_score ?? 70;

    // Combined quality score: reviewer (60%) + auto QC (40%)
    const overallScore = reviewScore * 0.6 + autoQcScore * 0.4;

    let decision: EvaluationResult['decision'];
    let xstateEvent: string;
    let requeued = false;
    let escalated = false;
    let reason: string;

    if (reviewDecision === 'APPROVE' && overallScore >= minScore) {
      decision = 'APPROVE';
      xstateEvent = 'APPROVE';
      reason = `Quality score ${overallScore.toFixed(1)} meets threshold ${minScore}`;

      // Update task status
      task.status = TaskStatus.APPROVED;
      task.allReviewsApproved = true;
      await this.taskRepo.save(task);

      await this.kafkaService.publishEvent('task.approved', {
        id: taskId,
        taskId,
        reviewerId,
        overallScore,
        decision: 'APPROVE',
      });
    } else if (reviewDecision === 'REQUEST_REVISION') {
      decision = 'REQUEST_REVISION';
      xstateEvent = 'REQUEST_REVISION';
      requeued = true;
      reason = 'Reviewer requested revision';

      task.status = TaskStatus.IN_PROGRESS;
      task.attemptCount = (task.attemptCount || 0) + 1;
      await this.taskRepo.save(task);

      await this.kafkaService.publishEvent('task.state_changed', {
        id: taskId,
        taskId,
        previousStatus: 'pendingReview',
        newStatus: 'inProgress',
        reason: 'Reviewer requested revision',
      });
    } else {
      // REJECT or score below minimum
      const attempts = (task.attemptCount || 0) + 1;
      task.attemptCount = attempts;

      if (attempts >= this.maxAttempts) {
        decision = 'ESCALATE';
        xstateEvent = 'ESCALATE';
        escalated = true;
        reason = `Max attempts (${this.maxAttempts}) reached. Escalating to manager.`;

        task.status = TaskStatus.REJECTED;
        await this.taskRepo.save(task);

        await this.kafkaService.publishEvent('task.escalated', {
          id: taskId,
          taskId,
          attempts,
          reason,
        });

        await this.kafkaService.publishNotification({
          userId: 'manager',
          type: 'SYSTEM_ALERT',
          title: 'Task Escalated',
          message: `Task ${taskId} has been rejected ${attempts} times and requires manager review.`,
          metadata: { taskId, attempts, reviewerId },
        });
      } else {
        decision = 'REJECT';
        xstateEvent = 'REJECT';
        requeued = true;
        reason = `Rejected: score ${overallScore.toFixed(1)} below threshold ${minScore}. Attempt ${attempts}/${this.maxAttempts}`;

        task.status = TaskStatus.QUEUED;
        await this.taskRepo.save(task);

        await this.kafkaService.publishEvent('task.rejected_to_queue', {
          id: taskId,
          taskId,
          reviewerId,
          overallScore,
          attempt: attempts,
          reason,
        });

        // Notify the annotator
        if (task.assignmentId) {
          await this.kafkaService.publishNotification({
            userId: task.assignmentId,
            type: 'FEEDBACK_RECEIVED',
            title: 'Task Rejected',
            message: `Your annotation for task ${taskId} was rejected. Reason: ${reason}`,
            metadata: { taskId },
          });
        }
      }
    }

    // Drive XState machine in Workflow Engine
    await this.workflowClient.sendTaskEvent(taskId, xstateEvent, {
      reviewerId,
      overallQualityScore: overallScore,
      reviewScore,
      autoQcScore,
      decision,
      attempts: task.attemptCount,
    });

    return this.buildResult(taskId, decision, xstateEvent, overallScore, requeued, escalated, reason);
  }

  async getTaskQaSummary(
    taskId: string,
    latestAnnotationId: string,
    autoQcScore: number,
    reviewScore: number,
    reviewDecision: string,
    reviewFeedback: string,
  ) {
    const overallQualityScore = reviewScore * 0.6 + autoQcScore * 0.4;
    const state = await this.workflowClient.getTaskState(taskId);

    return {
      taskId,
      annotationId: latestAnnotationId,
      autoQc: { score: autoQcScore },
      review: { score: reviewScore, decision: reviewDecision, feedback: reviewFeedback },
      overallQualityScore: Math.round(overallQualityScore * 100) / 100,
      currentState: state?.data?.current_state?.value ?? 'unknown',
    };
  }

  private buildResult(
    taskId: string,
    decision: EvaluationResult['decision'],
    xstateEvent: string,
    overallScore: number,
    requeued: boolean,
    escalated: boolean,
    reason: string,
  ): EvaluationResult {
    return {
      taskId,
      decision,
      stateEventSent: xstateEvent,
      overallQualityScore: Math.round(overallScore * 100) / 100,
      requeued,
      escalated,
      reason,
    };
  }
}
