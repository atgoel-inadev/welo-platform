import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task, Assignment } from '@app/common';

@Injectable()
export class ProductivityService {
  private readonly logger = new Logger(ProductivityService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    private readonly dataSource: DataSource,
  ) {}

  async getUserProductivity(userId: string, projectId?: string, dateFrom?: string, dateTo?: string) {
    const from = dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = dateTo ?? new Date().toISOString().split('T')[0];

    const rows = await this.dataSource.query(
      `SELECT
         DATE(a.completed_at) as date,
         COUNT(*) as completed,
         AVG(EXTRACT(EPOCH FROM (a.completed_at - a.assigned_at))) as avg_seconds
       FROM assignments a
       JOIN tasks t ON t.id = a.task_id
       WHERE a.user_id = $1
         AND a.status = 'COMPLETED'
         AND DATE(a.completed_at) BETWEEN $2 AND $3
         ${projectId ? 'AND t.project_id = $4' : ''}
       GROUP BY DATE(a.completed_at)
       ORDER BY date ASC`,
      projectId ? [userId, from, to, projectId] : [userId, from, to],
    );

    const totalCompleted = rows.reduce((sum: number, r: any) => sum + parseInt(r.completed, 10), 0);
    const avgTime = rows.length
      ? rows.reduce((sum: number, r: any) => sum + parseFloat(r.avg_seconds ?? '0'), 0) / rows.length
      : 0;

    return {
      userId,
      projectId,
      dateRange: { from, to },
      tasksCompleted: totalCompleted,
      avgTimePerTaskSeconds: Math.round(avgTime),
      dailySeries: rows.map((r: any) => ({
        date: r.date,
        completed: parseInt(r.completed, 10),
        avgTimeSeconds: Math.round(parseFloat(r.avg_seconds ?? '0')),
      })),
    };
  }

  async getCapacity(projectId: string) {
    const [annotatorCount, activeToday] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(DISTINCT user_id) FROM project_team_members WHERE project_id = $1 AND role = 'ANNOTATOR' AND is_active = true`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT COUNT(DISTINCT a.user_id) FROM assignments a
         JOIN tasks t ON t.id = a.task_id
         WHERE t.project_id = $1 AND DATE(a.assigned_at) = CURRENT_DATE`,
        [projectId],
      ),
    ]);

    const throughputRow = await this.dataSource.query(
      `SELECT COUNT(*) as completed_7d FROM assignments a
       JOIN tasks t ON t.id = a.task_id
       WHERE t.project_id = $1 AND a.status = 'COMPLETED'
         AND a.completed_at >= NOW() - INTERVAL '7 days'`,
      [projectId],
    );

    const queuedRow = await this.dataSource.query(
      `SELECT COUNT(*) as queued FROM tasks WHERE project_id = $1 AND status = 'QUEUED'`,
      [projectId],
    );

    const dailyThroughput = parseInt(throughputRow[0]?.completed_7d ?? '0', 10) / 7;
    const queuedTasks = parseInt(queuedRow[0]?.queued ?? '0', 10);

    return {
      projectId,
      totalAnnotators: parseInt(annotatorCount[0]?.count ?? '0', 10),
      activeToday: parseInt(activeToday[0]?.count ?? '0', 10),
      avgDailyThroughput: Math.round(dailyThroughput),
      queuedTasks,
      estimatedDaysToComplete: dailyThroughput > 0 ? Math.ceil(queuedTasks / dailyThroughput) : null,
    };
  }
}
