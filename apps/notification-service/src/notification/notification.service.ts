import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, Priority } from '@app/common';
import { InAppChannel } from '../channels/inapp.channel';
import { EmailChannel } from '../channels/email.channel';
import { WebhookChannel } from '../channels/webhook.channel';
import { NotificationGateway } from '../realtime/notification.gateway';

export interface SendNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: Priority;
  link?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly inAppChannel: InAppChannel,
    private readonly emailChannel: EmailChannel,
    private readonly webhookChannel: WebhookChannel,
    private readonly gateway: NotificationGateway,
  ) {}

  async send(payload: SendNotificationPayload): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      priority: payload.priority ?? Priority.MEDIUM,
      link: payload.link ?? null,
      isRead: false,
      expiresAt: payload.expiresAt ?? null,
    });

    // Attach metadata for channels that need project context (e.g. webhook channel)
    if (payload.metadata) {
      (notification as any).metadata = payload.metadata;
    }

    const saved = await this.notificationRepo.save(notification);

    // Dispatch to all channels (failures are non-fatal)
    await Promise.allSettled([
      this.inAppChannel.send(saved, payload.userId),
      this.emailChannel.send(saved, payload.userId),
      this.webhookChannel.send(saved, payload.userId),
    ]);

    // Real-time WebSocket push
    this.gateway.emitToUser(payload.userId, saved);

    this.logger.debug(`Notification sent to user ${payload.userId}: [${payload.type}] ${payload.title}`);
    return saved;
  }

  async listForUser(
    userId: string,
    isRead?: boolean,
    page = 1,
    limit = 20,
  ): Promise<{ data: Notification[]; total: number }> {
    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead;

    const [data, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);

    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationRepo.save(notification);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('user_id = :userId AND is_read = false', { userId })
      .execute();

    return { updated: result.affected ?? 0 };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo.count({ where: { userId, isRead: false } });
    return { count };
  }

  async delete(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    await this.notificationRepo.remove(notification);
  }
}
