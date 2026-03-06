import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog } from '@app/common';
import { AuditQueryDto } from './dto/audit-query.dto';

export interface ComplianceReport {
  projectId?: string;
  dateFrom: string;
  dateTo: string;
  totalActions: number;
  actionBreakdown: Record<string, number>;
  userActionSummary: { userId: string; actionCount: number; actions: string[] }[];
  exportEvents: AuditLog[];
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async queryAuditLogs(filter: AuditQueryDto): Promise<{ data: AuditLog[]; total: number }> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.userId) where.userId = filter.userId;
    if (filter.action) where.action = filter.action;
    if (filter.dateFrom && filter.dateTo) {
      where.timestamp = Between(new Date(filter.dateFrom), new Date(filter.dateTo));
    }

    const [data, total] = await this.auditRepo.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      skip: ((filter.page ?? 1) - 1) * (filter.limit ?? 50),
      take: filter.limit ?? 50,
    });

    return { data, total };
  }

  async getEntityAuditTrail(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { entityType: entityType.toUpperCase(), entityId },
      order: { timestamp: 'ASC' },
    });
  }

  async getUserAuditTrail(userId: string, dateFrom?: string, dateTo?: string): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLog> = { userId };
    if (dateFrom && dateTo) {
      where.timestamp = Between(new Date(dateFrom), new Date(dateTo));
    }
    return this.auditRepo.find({ where, order: { timestamp: 'DESC' } });
  }

  async generateComplianceReport(projectId: string | undefined, dateFrom: string, dateTo: string): Promise<ComplianceReport> {
    const logs = await this.auditRepo.find({
      where: { timestamp: Between(new Date(dateFrom), new Date(dateTo)) },
      order: { timestamp: 'ASC' },
    });

    const actionBreakdown: Record<string, number> = {};
    const userMap = new Map<string, Set<string>>();

    for (const log of logs) {
      actionBreakdown[log.action] = (actionBreakdown[log.action] ?? 0) + 1;
      if (log.userId) {
        if (!userMap.has(log.userId)) userMap.set(log.userId, new Set());
        userMap.get(log.userId).add(log.action);
      }
    }

    const userActionSummary = Array.from(userMap.entries()).map(([userId, actions]) => ({
      userId,
      actionCount: logs.filter((l) => l.userId === userId).length,
      actions: Array.from(actions),
    }));

    const exportEvents = logs.filter((l) => l.entityType === 'EXPORT');

    return {
      projectId,
      dateFrom,
      dateTo,
      totalActions: logs.length,
      actionBreakdown,
      userActionSummary,
      exportEvents,
    };
  }

  async getStats(dateFrom?: string, dateTo?: string): Promise<{
    actionBreakdown: Record<string, number>;
    entityTypeBreakdown: Record<string, number>;
    dailySeries: { date: string; count: number }[];
  }> {
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    const [actionRows, entityRows, dailyRows] = await Promise.all([
      this.auditRepo
        .createQueryBuilder('a')
        .select('a.action', 'action')
        .addSelect('COUNT(*)', 'count')
        .where('a.timestamp BETWEEN :from AND :to', { from, to })
        .groupBy('a.action')
        .getRawMany(),
      this.auditRepo
        .createQueryBuilder('a')
        .select('a.entityType', 'entityType')
        .addSelect('COUNT(*)', 'count')
        .where('a.timestamp BETWEEN :from AND :to', { from, to })
        .groupBy('a.entityType')
        .getRawMany(),
      this.auditRepo
        .createQueryBuilder('a')
        .select("DATE_TRUNC('day', a.timestamp)", 'date')
        .addSelect('COUNT(*)', 'count')
        .where('a.timestamp BETWEEN :from AND :to', { from, to })
        .groupBy("DATE_TRUNC('day', a.timestamp)")
        .orderBy("DATE_TRUNC('day', a.timestamp)", 'ASC')
        .getRawMany(),
    ]);

    return {
      actionBreakdown: Object.fromEntries(actionRows.map((r) => [r.action, parseInt(r.count, 10)])),
      entityTypeBreakdown: Object.fromEntries(entityRows.map((r) => [r.entityType, parseInt(r.count, 10)])),
      dailySeries: dailyRows.map((r) => ({
        date: new Date(r.date).toISOString().split('T')[0],
        count: parseInt(r.count, 10),
      })),
    };
  }

  async anonymizeUser(userId: string): Promise<{ anonymizedCount: number }> {
    const result = await this.auditRepo
      .createQueryBuilder()
      .update(AuditLog)
      .set({ userId: null })
      .where('user_id = :userId', { userId })
      .execute();

    this.logger.log(`Anonymized ${result.affected} audit records for user ${userId}`);
    return { anonymizedCount: result.affected ?? 0 };
  }
}
