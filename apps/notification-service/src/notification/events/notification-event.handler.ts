import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { NotificationService } from '../notification.service';
import { WebhookService } from '../../webhook/webhook.service';
import { IMessagingService, MESSAGING_SERVICE, MessagePayload } from '@app/infrastructure';
import { NotificationType, Priority } from '@app/common';

@Injectable()
export class NotificationEventHandler implements OnModuleInit {
  private readonly logger = new Logger(NotificationEventHandler.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly webhookService: WebhookService,
    @Inject(MESSAGING_SERVICE)
    private readonly messagingService: IMessagingService,
  ) {}

  async onModuleInit() {
    await this.messagingService.subscribe('notification.send', async (payload: MessagePayload) => {
      const message = JSON.parse(payload.value.toString());
      await this.handleDirectNotification(message);
    });

    await this.messagingService.subscribe('task.assigned', async (payload: MessagePayload) => {
      const message = JSON.parse(payload.value.toString());
      await Promise.all([
        this.handleTaskAssigned(message),
        this.dispatchWebhook(message.projectId, 'task.assigned', message),
      ]);
    });

    await this.messagingService.subscribe('assignment.expired', async (payload: MessagePayload) => {
      const message = JSON.parse(payload.value.toString());
      await Promise.all([
        this.handleAssignmentExpired(message),
        this.dispatchWebhook(message.projectId, 'assignment.expired', message),
      ]);
    });

    await this.messagingService.subscribe('batch.completed', async (payload: MessagePayload) => {
      const message = JSON.parse(payload.value.toString());
      await Promise.all([
        this.handleBatchCompleted(message),
        this.dispatchWebhook(message.projectId, 'batch.completed', message),
      ]);
    });

    await this.messagingService.subscribe('export.completed', async (payload: MessagePayload) => {
      const message = JSON.parse(payload.value.toString());
      await Promise.all([
        this.handleExportCompleted(message),
        this.dispatchWebhook(message.projectId, 'export.completed', message),
      ]);
    });

    await this.messagingService.subscribe('quality_check.failed', async (payload: MessagePayload) => {
      const message = JSON.parse(payload.value.toString());
      await Promise.all([
        this.handleQualityCheckFailed(message),
        this.dispatchWebhook(message.projectId, 'quality_check.failed', message),
      ]);
    });

    this.logger.log('Notification event handler initialized');
  }

  // Fan-out to project webhooks; silently no-ops if projectId is absent or no matching webhooks
  private async dispatchWebhook(projectId: string | undefined, eventType: string, payload: any): Promise<void> {
    if (!projectId) return;
    try {
      await this.webhookService.dispatchEvent(projectId, eventType, payload);
    } catch (err) {
      this.logger.error(`Webhook dispatch failed [${eventType}]: ${(err as Error).message}`);
    }
  }

  private async handleDirectNotification(payload: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: Priority;
    link?: string;
  }) {
    try {
      await this.notificationService.send({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        priority: payload.priority ?? Priority.MEDIUM,
        link: payload.link,
      });
    } catch (err) {
      this.logger.error(`Failed to deliver direct notification: ${(err as Error).message}`);
    }
  }

  private async handleTaskAssigned(payload: { userId?: string; taskId?: string; externalId?: string }) {
    if (!payload.userId) return;
    await this.handleDirectNotification({
      userId: payload.userId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: `You have been assigned a new task${payload.externalId ? ': ' + payload.externalId : ''}.`,
      priority: Priority.MEDIUM,
      link: payload.taskId ? `/tasks/${payload.taskId}` : undefined,
    });
  }

  private async handleAssignmentExpired(payload: { userId?: string; taskId?: string }) {
    if (!payload.userId) return;
    await this.handleDirectNotification({
      userId: payload.userId,
      type: NotificationType.TASK_EXPIRED,
      title: 'Task Assignment Expired',
      message: 'Your task assignment has expired and the task has been returned to the queue.',
      priority: Priority.HIGH,
      link: payload.taskId ? `/tasks/${payload.taskId}` : undefined,
    });
  }

  private async handleBatchCompleted(payload: { projectManagerId?: string; batchId?: string; batchName?: string }) {
    if (!payload.projectManagerId) return;
    await this.handleDirectNotification({
      userId: payload.projectManagerId,
      type: NotificationType.BATCH_COMPLETED,
      title: 'Batch Completed',
      message: `Batch "${payload.batchName ?? payload.batchId}" has been completed.`,
      priority: Priority.MEDIUM,
      link: payload.batchId ? `/batches/${payload.batchId}` : undefined,
    });
  }

  private async handleExportCompleted(payload: { requestedBy?: string; exportId?: string; format?: string; fileUrl?: string }) {
    if (!payload.requestedBy) return;
    await this.handleDirectNotification({
      userId: payload.requestedBy,
      type: NotificationType.EXPORT_READY,
      title: 'Export Ready',
      message: `Your ${payload.format ?? ''} export is ready for download.`,
      priority: Priority.MEDIUM,
      link: payload.exportId ? `/exports/${payload.exportId}/download` : undefined,
    });
  }

  private async handleQualityCheckFailed(payload: { userId?: string; taskId?: string }) {
    if (!payload.userId) return;
    await this.handleDirectNotification({
      userId: payload.userId,
      type: NotificationType.QUALITY_ISSUE,
      title: 'Quality Check Failed',
      message: 'A quality check has failed. Please review your annotation.',
      priority: Priority.HIGH,
      link: payload.taskId ? `/tasks/${payload.taskId}` : undefined,
    });
  }
}
