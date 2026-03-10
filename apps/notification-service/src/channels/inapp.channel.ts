import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '@app/common';
import { INotificationChannel } from './channel.interface';

/**
 * In-app channel: the notification is already persisted to the DB by NotificationService.send().
 * This channel is a no-op placeholder; real-time delivery is handled by NotificationGateway (WebSocket).
 */
@Injectable()
export class InAppChannel implements INotificationChannel {
  readonly name = 'inapp';
  private readonly logger = new Logger(InAppChannel.name);

  async send(notification: Notification, recipientId: string): Promise<void> {
    // The record is already written by NotificationService before dispatching to channels.
    // WebSocket push is handled by NotificationGateway.emitToUser().
    this.logger.debug(`[in-app] notification ${notification.id} queued for user ${recipientId}`);
  }
}
