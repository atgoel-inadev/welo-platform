import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class QualityService {
  private readonly logger = new Logger(QualityService.name);

  constructor(private readonly dataSource: DataSource) {}

  async getQualityTrends(projectId?: string, batchId?: string, dateFrom?: string, dateTo?: string) {
    const from = dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = dateTo ?? new Date().toISOString().split('T')[0];

    const params: any[] = [from, to];
    let projectFilter = '';
    if (projectId) { params.push(projectId); projectFilter = `AND qc.project_id = $${params.length}`; }
    if (batchId) { params.push(batchId); projectFilter += ` AND t.batch_id = $${params.length}`; }

    const [overallRow, trendRows] = await Promise.all([
      this.dataSource.query(
        `SELECT AVG(qc.quality_score) as avg_score,
                COUNT(*) FILTER (WHERE qc.status = 'PASS') * 100.0 / NULLIF(COUNT(*), 0) as pass_rate
         FROM quality_checks qc
         JOIN tasks t ON t.id = qc.task_id
         WHERE DATE(qc.created_at) BETWEEN $1 AND $2 ${projectFilter}`,
        params,
      ),
      this.dataSource.query(
        `SELECT DATE(qc.created_at) as date,
                AVG(qc.quality_score) as avg_score,
                COUNT(*) FILTER (WHERE qc.status = 'PASS') * 100.0 / NULLIF(COUNT(*), 0) as pass_rate
         FROM quality_checks qc
         JOIN tasks t ON t.id = qc.task_id
         WHERE DATE(qc.created_at) BETWEEN $1 AND $2 ${projectFilter}
         GROUP BY DATE(qc.created_at)
         ORDER BY date ASC`,
        params,
      ),
    ]);

    return {
      projectId,
      batchId,
      dateRange: { from, to },
      overallScore: parseFloat(overallRow[0]?.avg_score ?? '0') || 0,
      passRate: parseFloat(overallRow[0]?.pass_rate ?? '0') || 0,
      trendSeries: trendRows.map((r: any) => ({
        date: r.date,
        avgScore: parseFloat(r.avg_score ?? '0') || 0,
        passRate: parseFloat(r.pass_rate ?? '0') || 0,
      })),
    };
  }

  async getQualityByAnnotator(projectId: string, dateFrom?: string, dateTo?: string) {
    const from = dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = dateTo ?? new Date().toISOString().split('T')[0];

    const rows = await this.dataSource.query(
      `SELECT a.user_id,
              COUNT(*) as submit_count,
              AVG(qc.quality_score) as avg_score,
              COUNT(*) FILTER (WHERE qc.status = 'FAIL') * 100.0 / NULLIF(COUNT(*), 0) as reject_rate
       FROM assignments a
       JOIN tasks t ON t.id = a.task_id
       LEFT JOIN quality_checks qc ON qc.task_id = t.id
       WHERE t.project_id = $1 AND DATE(a.completed_at) BETWEEN $2 AND $3
         AND a.status = 'COMPLETED'
       GROUP BY a.user_id
       ORDER BY avg_score DESC`,
      [projectId, from, to],
    );

    return rows.map((r: any) => ({
      userId: r.user_id,
      submitCount: parseInt(r.submit_count, 10),
      avgScore: parseFloat(r.avg_score ?? '0') || 0,
      rejectRate: parseFloat(r.reject_rate ?? '0') || 0,
    }));
  }
}
