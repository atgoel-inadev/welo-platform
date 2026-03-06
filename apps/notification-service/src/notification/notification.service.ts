import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, Priority } from '@app/common';

export interface SendNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: Priority;
  link?: string;
  expiresAt?: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
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

    const saved = await this.notificationRepo.save(notification);
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
