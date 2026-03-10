import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { IMessagingService, MESSAGING_SERVICE, MessagePayload, RedisService } from '@app/infrastructure';

@Injectable()
export class AnalyticsEventHandler implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsEventHandler.name);

  constructor(
    @Inject(MESSAGING_SERVICE)
    private readonly messagingService: IMessagingService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    await this.messagingService.subscribe('task.completed', async (payload: MessagePayload) => {
      const message = JSON.parse(payload.value.toString());
      await this.invalidateDashboard(message.projectId);
    });

    await this.messagingService.subscribe('batch.completed', async (payload: MessagePayload) => {
      const message = JSON.parse(payload.value.toString());
      await Promise.all([
        this.invalidateDashboard(message.projectId),
        this.invalidateProjectProgress(message.id ?? message.projectId),
      ]);
    });

    await this.messagingService.subscribe('quality_check.completed', async (payload: MessagePayload) => {
      const message = JSON.parse(payload.value.toString());
      await this.invalidateQuality(message.projectId);
    });

    this.logger.log('Analytics event handler initialized — subscribed to 3 Kafka topics');
  }

  private async invalidateDashboard(projectId?: string): Promise<void> {
    try {
      const keys = ['analytics:dashboard:global'];
      if (projectId) keys.push(`analytics:dashboard:${projectId}`);
      await this.redis.del(...keys);
      this.logger.debug(`Dashboard cache invalidated for projectId=${projectId ?? 'global'}`);
    } catch (err) {
      this.logger.warn(`Cache invalidation failed: ${(err as Error).message}`);
    }
  }

  private async invalidateQuality(projectId?: string): Promise<void> {
    try {
      if (projectId) {
        await this.redis.del(`analytics:quality:${projectId}`);
        this.logger.debug(`Quality cache invalidated for projectId=${projectId}`);
      }
    } catch (err) {
      this.logger.warn(`Quality cache invalidation failed: ${(err as Error).message}`);
    }
  }

  private async invalidateProjectProgress(projectId?: string): Promise<void> {
    try {
      if (projectId) {
        await this.redis.del(`analytics:project:${projectId}`);
        this.logger.debug(`Project progress cache invalidated for projectId=${projectId}`);
      }
    } catch (err) {
      this.logger.warn(`Project progress cache invalidation failed: ${(err as Error).message}`);
    }
  }
}
