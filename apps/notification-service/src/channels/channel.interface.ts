import { Notification } from '@app/common';

export interface INotificationChannel {
  readonly name: string;
  send(notification: Notification, recipientId: string): Promise<void>;
}
