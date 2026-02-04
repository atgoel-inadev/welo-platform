import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { ServiceStatus } from '@app/common';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private redisService: RedisService,
  ) {}

  async check() {
    const services = await this.checkServices();

    const overallStatus =
      Object.values(services).every((s) => s === ServiceStatus.HEALTHY)
        ? ServiceStatus.HEALTHY
        : ServiceStatus.DEGRADED;

    return {
      status: overallStatus,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services,
    };
  }

  async getStatus() {
    const health = await this.check();
    return {
      ...health,
      service: 'workflow-engine',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  private async checkServices(): Promise<Record<string, ServiceStatus>> {
    const services: Record<string, ServiceStatus> = {};

    // Check database
    try {
      await this.dataSource.query('SELECT 1');
      services.database = ServiceStatus.HEALTHY;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      services.database = ServiceStatus.DOWN;
    }

    // Check Redis
    try {
      await this.redisService.set('health:check', 'ok', 10);
      const result = await this.redisService.get('health:check');
      services.cache = result === 'ok' ? ServiceStatus.HEALTHY : ServiceStatus.DOWN;
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      services.cache = ServiceStatus.DOWN;
    }

    return services;
  }
}
