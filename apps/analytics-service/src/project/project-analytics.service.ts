import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ProjectAnalyticsService {
  private readonly logger = new Logger(ProjectAnalyticsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async getProjectProgress(projectId: string) {
    const [batchRows, stageRows] = await Promise.all([
      this.dataSource.query(
        `SELECT b.id, b.name, b.total_tasks,
                COUNT(t.id) FILTER (WHERE t.status IN ('APPROVED','SUBMITTED')) as completed,
                COUNT(t.id) FILTER (WHERE t.status IN ('ASSIGNED','IN_PROGRESS')) as in_progress,
                COUNT(t.id) FILTER (WHERE t.status = 'QUEUED') as queued
         FROM batches b
         LEFT JOIN tasks t ON t.batch_id = b.id
         WHERE b.project_id = $1
         GROUP BY b.id, b.name, b.total_tasks
         ORDER BY b.created_at DESC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT t.status, COUNT(*) as count
         FROM tasks t
         WHERE t.project_id = $1
         GROUP BY t.status`,
        [projectId],
      ),
    ]);

    const statusDistribution = Object.fromEntries(
      stageRows.map((r: any) => [r.status, parseInt(r.count, 10)]),
    );

    const totalTasks = Object.values(statusDistribution).reduce((a: any, b: any) => a + b, 0) as number;
    const completedTasks = (statusDistribution['APPROVED'] ?? 0) + (statusDistribution['SUBMITTED'] ?? 0);
    const dailyThroughput = await this.getDailyThroughput(projectId);
    const queuedTasks = statusDistribution['QUEUED'] ?? 0;

    return {
      projectId,
      batchBreakdown: batchRows.map((r: any) => ({
        batchId: r.id,
        name: r.name,
        totalTasks: parseInt(r.total_tasks ?? '0', 10),
        completed: parseInt(r.completed ?? '0', 10),
        inProgress: parseInt(r.in_progress ?? '0', 10),
        queued: parseInt(r.queued ?? '0', 10),
        completionRate: r.total_tasks > 0 ? (r.completed / r.total_tasks) * 100 : 0,
      })),
      workflowStageDistribution: statusDistribution,
      totalTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      projectedDaysToComplete: dailyThroughput > 0 ? Math.ceil(queuedTasks / dailyThroughput) : null,
    };
  }

  async getStateTransitions(entityType: string, entityId?: string, dateFrom?: string, dateTo?: string) {
    const params: any[] = [entityType.toUpperCase()];
    let filters = 'WHERE st.entity_type = $1';

    if (entityId) { params.push(entityId); filters += ` AND st.entity_id = $${params.length}`; }
    if (dateFrom) { params.push(dateFrom); filters += ` AND st.transitioned_at >= $${params.length}`; }
    if (dateTo) { params.push(dateTo); filters += ` AND st.transitioned_at <= $${params.length}`; }

    return this.dataSource.query(
      `SELECT * FROM state_transitions st ${filters} ORDER BY st.transitioned_at DESC LIMIT 200`,
      params,
    );
  }

  private async getDailyThroughput(projectId: string): Promise<number> {
    const row = await this.dataSource.query(
      `SELECT COUNT(*) as completed_7d FROM assignments a
       JOIN tasks t ON t.id = a.task_id
       WHERE t.project_id = $1 AND a.status = 'COMPLETED'
         AND a.completed_at >= NOW() - INTERVAL '7 days'`,
      [projectId],
    );
    return parseInt(row[0]?.completed_7d ?? '0', 10) / 7;
  }
}
