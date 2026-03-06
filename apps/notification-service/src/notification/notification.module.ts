import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification, User } from '@app/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationEventHandler } from './events/notification-event.handler';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    WebhookModule, // provides WebhookService for event fan-out
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationEventHandler],
  exports: [NotificationService],
})
export class NotificationModule {}
