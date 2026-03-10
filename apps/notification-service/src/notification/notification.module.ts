import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification, User } from '@app/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationEventHandler } from './events/notification-event.handler';
import { WebhookModule } from '../webhook/webhook.module';
import { InAppChannel } from '../channels/inapp.channel';
import { EmailChannel } from '../channels/email.channel';
import { WebhookChannel } from '../channels/webhook.channel';
import { NotificationGateway } from '../realtime/notification.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    WebhookModule, // provides WebhookService for event fan-out and WebhookChannel
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationEventHandler,
    NotificationGateway,
    InAppChannel,
    EmailChannel,
    WebhookChannel,
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
