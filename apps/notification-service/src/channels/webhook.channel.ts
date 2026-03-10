import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '@app/common';
import { INotificationChannel } from './channel.interface';
import { WebhookService } from '../webhook/webhook.service';

/**
 * Webhook channel — fans out to all active project webhooks registered for this event type.
 * Delegates retry + HMAC signing logic to WebhookService.
 */
@Injectable()
export class WebhookChannel implements INotificationChannel {
  readonly name = 'webhook';
  private readonly logger = new Logger(WebhookChannel.name);

  constructor(private readonly webhookService: WebhookService) {}

  async send(notification: Notification, _recipientId: string): Promise<void> {
    // Webhooks are scoped to projects, not individual users.
    // The metadata field on the notification may carry projectId when set by the event handler.
    const projectId = (notification as any).metadata?.projectId;
    if (!projectId) {
      this.logger.debug(`[webhook] no projectId on notification ${notification.id} — skipping`);
      return;
    }

    try {
      await this.webhookService.dispatchEvent(projectId, notification.type, {
        notificationId: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        userId: notification.userId,
        createdAt: notification.createdAt,
      });
    } catch (err) {
      this.logger.error(`[webhook] dispatch failed for notification ${notification.id}: ${(err as Error).message}`);
    }
  }
}
