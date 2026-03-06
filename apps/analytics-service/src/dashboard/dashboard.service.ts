import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task, Project, Assignment, QualityCheck } from '@app/common';
import { RedisService } from '@app/infrastructure';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly cacheTtl = parseInt(process.env.ANALYTICS_CACHE_TTL_SECONDS ?? '300', 10);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(QualityCheck)
    private readonly qcRepo: Repository<QualityCheck>,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  async getDashboard(projectId?: string, customerId?: string, dateFrom?: string, dateTo?: string) {
    const cacheKey = `analytics:dashboard:${customerId ?? projectId ?? 'global'}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);

    const [
      activeProjects,
      completedToday,
      avgQualityScore,
      topAnnotators,
    ] = await Promise.all([
      this.countActiveProjects(customerId),
      this.countCompletedToday(projectId),
      this.getAvgQualityScore(projectId),
      this.getTopAnnotators(projectId),
    ]);

    const result = {
      activeProjects,
      completedToday,
      avgQualityScore,
      topAnnotators,
      generatedAt: new Date().toISOString(),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.cacheTtl).catch(() => {});
    return result;
  }

  async invalidateCache(projectId: string) {
    await this.redis.del(`analytics:dashboard:${projectId}`).catch(() => {});
    await this.redis.del('analytics:dashboard:global').catch(() => {});
  }

  private async countActiveProjects(customerId?: string): Promise<number> {
    const qb = this.projectRepo.createQueryBuilder('p').where("p.status = 'ACTIVE'");
    if (customerId) qb.andWhere('p.customer_id = :customerId', { customerId });
    return qb.getCount();
  }

  private async countCompletedToday(projectId?: string): Promise<number> {
    const qb = this.taskRepo
      .createQueryBuilder('t')
      .where("t.status IN ('APPROVED','SUBMITTED')")
      .andWhere('DATE(t.submitted_at) = CURRENT_DATE');
    if (projectId) qb.andWhere('t.project_id = :projectId', { projectId });
    return qb.getCount();
  }

  private async getAvgQualityScore(projectId?: string): Promise<number> {
    const qb = this.qcRepo
      .createQueryBuilder('qc')
      .select('AVG(qc.quality_score)', 'avg')
      .where("qc.status = 'PASS'")
      .andWhere("qc.created_at >= NOW() - INTERVAL '7 days'");
    if (projectId) qb.andWhere('qc.project_id = :projectId', { projectId });
    const row = await qb.getRawOne();
    return parseFloat(row?.avg ?? '0') || 0;
  }

  private async getTopAnnotators(projectId?: string): Promise<any[]> {
    const rows = await this.dataSource.query(
      `SELECT a.user_id, COUNT(*) as completed, AVG(qc.quality_score) as avg_quality
       FROM assignments a
       JOIN tasks t ON t.id = a.task_id
       LEFT JOIN quality_checks qc ON qc.task_id = t.id
       WHERE a.status = 'COMPLETED' AND DATE(a.completed_at) = CURRENT_DATE
       ${projectId ? "AND t.project_id = '" + projectId + "'" : ''}
       GROUP BY a.user_id
       ORDER BY completed DESC
       LIMIT 10`,
    );
    return rows.map((r: any) => ({
      userId: r.user_id,
      completedToday: parseInt(r.completed, 10),
      avgQuality: parseFloat(r.avg_quality ?? '0') || 0,
    }));
  }
}
