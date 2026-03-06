import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '@app/common';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly auditService: AuditService,
  ) {}

  async generateReport(projectId: string | undefined, dateFrom: string, dateTo: string) {
    return this.auditService.generateComplianceReport(projectId, dateFrom, dateTo);
  }

  async getDataRetentionStatus() {
    const oldest = await this.auditRepo
      .createQueryBuilder('al')
      .select('MIN(al.timestamp)', 'oldestRecord')
      .addSelect('COUNT(*)', 'totalRecords')
      .getRawOne();

    return {
      oldestRecord: oldest?.oldestRecord ?? null,
      totalRecords: parseInt(oldest?.totalRecords ?? '0', 10),
      retentionPolicyDays: 365,
      recommendation:
        oldest?.oldestRecord &&
        new Date(oldest.oldestRecord) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          ? 'Consider archiving records older than 1 year'
          : 'Data retention within policy',
    };
  }

  async anonymizeUser(userId: string) {
    return this.auditService.anonymizeUser(userId);
  }
}
