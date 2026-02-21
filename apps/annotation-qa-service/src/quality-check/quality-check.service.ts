import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QualityCheck, QualityCheckType, QualityCheckStatus, QualityRule, Annotation, Task, Project } from '@app/common';
import { CreateQualityCheckDto, ResolveQualityCheckDto, CreateQualityRuleDto } from './dto/quality-check.dto';
import { QualityRulesEngine } from './quality-rules.engine';
import { GoldTaskService } from '../gold-task/gold-task.service';
import { StateManagementService } from '../state-management/state-management.service';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class QualityCheckService {
  private readonly logger = new Logger(QualityCheckService.name);

  constructor(
    @InjectRepository(QualityCheck)
    private readonly qcRepo: Repository<QualityCheck>,
    @InjectRepository(QualityRule)
    private readonly ruleRepo: Repository<QualityRule>,
    @InjectRepository(Annotation)
    private readonly annotationRepo: Repository<Annotation>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly rulesEngine: QualityRulesEngine,
    private readonly goldTaskService: GoldTaskService,
    private readonly stateManagement: StateManagementService,
    private readonly kafkaService: KafkaService,
  ) {}

  /**
   * Full automated QC pipeline triggered on annotation submission.
   * Returns whether QC passed and a score.
   */
  async runAutomatedPipeline(
    taskId: string,
    annotationId: string,
    projectId: string,
  ): Promise<{ passed: boolean; score: number; goldComparisonRan: boolean }> {
    const annotation = await this.annotationRepo.findOne({ where: { id: annotationId } });
    if (!annotation) throw new NotFoundException(`Annotation ${annotationId} not found`);

    // 1. Run gold comparison if gold task exists
    const goldResult = await this.goldTaskService.runComparisonForAnnotation(
      taskId,
      annotation.annotationData,
    );

    // 2. Fetch and run quality rules for the project
    const rules = await this.ruleRepo.find({ where: { projectId, isActive: true } });
    const ruleResult = this.rulesEngine.evaluate(
      annotation.annotationData,
      Number(annotation.confidenceScore),
      rules,
      goldResult.ran ? goldResult.score : undefined,
    );

    // 3. Compute combined score (rule score + gold similarity)
    const combinedScore = goldResult.ran
      ? ruleResult.overallScore * 0.6 + goldResult.score * 100 * 0.4
      : ruleResult.overallScore;

    const passed = ruleResult.passed && (!goldResult.ran || goldResult.passed);

    // 4. Persist the quality check record
    const issues = ruleResult.results.flatMap((r) => r.issues);
    const qc = await this.qcRepo.save(
      this.qcRepo.create({
        taskId,
        annotationId,
        reviewerId: 'system',
        checkType: goldResult.ran ? QualityCheckType.GOLD_STANDARD : QualityCheckType.AUTOMATED,
        status: passed ? QualityCheckStatus.PASS : QualityCheckStatus.FAIL,
        qualityScore: Math.round(combinedScore * 100) / 100,
        issues,
        feedback: passed
          ? 'Automated QC passed'
          : `Automated QC failed. Issues: ${issues.map((i) => i.category).join(', ')}`,
      }),
    );

    // 5. Publish event and trigger state transition
    const eventType = passed ? 'auto_qc.passed' : 'auto_qc.failed';
    await this.kafkaService.publishEvent(eventType, {
      id: qc.id,
      taskId,
      annotationId,
      score: qc.qualityScore,
      issues,
    });

    await this.kafkaService.publishEvent('quality_check.completed', {
      id: qc.id,
      taskId,
      annotationId,
      passed,
      score: qc.qualityScore,
      checkType: qc.checkType,
    });

    // 6. Send XState event to Workflow Engine
    const xstateEvent = passed ? 'AUTO_QC_PASSED' : 'AUTO_QC_FAILED';
    await this.stateManagement.sendWorkflowEvent(taskId, xstateEvent, {
      qualityScore: qc.qualityScore,
      goldSimilarityScore: goldResult.ran ? goldResult.score : null,
      autoQcCheckId: qc.id,
    });

    return { passed, score: qc.qualityScore, goldComparisonRan: goldResult.ran };
  }

  async createManual(taskId: string, dto: CreateQualityCheckDto) {
    const annotation = await this.annotationRepo.findOne({ where: { id: dto.annotationId } });
    if (!annotation) throw new NotFoundException(`Annotation ${dto.annotationId} not found`);

    const qc = await this.qcRepo.save(
      this.qcRepo.create({
        taskId,
        annotationId: dto.annotationId,
        reviewerId: 'manual',
        checkType: dto.checkType,
        status: dto.qualityScore >= 70 ? QualityCheckStatus.PASS : QualityCheckStatus.FAIL,
        qualityScore: dto.qualityScore,
        issues: dto.issues as any,
        feedback: dto.feedback,
      }),
    );

    await this.kafkaService.publishEvent('quality_check.completed', {
      id: qc.id,
      taskId,
      annotationId: dto.annotationId,
      passed: qc.status === QualityCheckStatus.PASS,
      checkType: dto.checkType,
    });

    return qc;
  }

  async getByTask(taskId: string) {
    return this.qcRepo.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOne(checkId: string) {
    const qc = await this.qcRepo.findOne({ where: { id: checkId } });
    if (!qc) throw new NotFoundException(`Quality check ${checkId} not found`);
    return qc;
  }

  async resolve(checkId: string, dto: ResolveQualityCheckDto) {
    const qc = await this.qcRepo.findOne({ where: { id: checkId } });
    if (!qc) throw new NotFoundException(`Quality check ${checkId} not found`);

    qc.resolvedAt = new Date();
    qc.resolvedBy = dto.resolvedBy;
    if (dto.correctedAnnotationId) qc.correctedAnnotationId = dto.correctedAnnotationId;

    return this.qcRepo.save(qc);
  }

  async runBatchAutomated(
    batchId: string,
    samplePercentage: number = 100,
  ): Promise<{ processed: number; passed: number; failed: number }> {
    const tasks = await this.taskRepo.find({ where: { batchId } });
    const sample = Math.ceil((tasks.length * samplePercentage) / 100);
    const sampled = tasks.slice(0, sample);

    let passed = 0;
    let failed = 0;

    for (const task of sampled) {
      const annotations = await this.annotationRepo.find({
        where: { taskId: task.id, isFinal: true },
        order: { submittedAt: 'DESC' },
        take: 1,
      });
      if (annotations.length === 0) continue;

      const result = await this.runAutomatedPipeline(task.id, annotations[0].id, task.projectId);
      result.passed ? passed++ : failed++;
    }

    return { processed: sampled.length, passed, failed };
  }

  async getProjectMetrics(projectId: string, startDate?: string, endDate?: string) {
    const query = this.qcRepo.createQueryBuilder('qc').where('qc.task_id IN (SELECT id FROM tasks WHERE project_id = :projectId)', { projectId });

    if (startDate) query.andWhere('qc.created_at >= :startDate', { startDate });
    if (endDate) query.andWhere('qc.created_at <= :endDate', { endDate });

    const checks = await query.getMany();

    const total = checks.length;
    const passed = checks.filter((c) => c.status === QualityCheckStatus.PASS).length;
    const avgScore = total > 0 ? checks.reduce((s, c) => s + Number(c.qualityScore), 0) / total : 0;

    const issueCategories: Record<string, number> = {};
    for (const check of checks) {
      for (const issue of check.issues || []) {
        issueCategories[issue.category] = (issueCategories[issue.category] || 0) + 1;
      }
    }

    return {
      projectId,
      totalChecks: total,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      overallQualityScore: Math.round(avgScore * 100) / 100,
      commonIssues: Object.entries(issueCategories)
        .sort(([, a], [, b]) => b - a)
        .map(([category, count]) => ({ category, count, percentage: (count / total) * 100 })),
    };
  }

  // Quality Rules CRUD
  async createRule(projectId: string, dto: CreateQualityRuleDto) {
    return this.ruleRepo.save(
      this.ruleRepo.create({ projectId, ...dto }),
    );
  }

  async getRules(projectId: string) {
    return this.ruleRepo.find({ where: { projectId } });
  }

  async deleteRule(ruleId: string) {
    const rule = await this.ruleRepo.findOne({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException(`Rule ${ruleId} not found`);
    rule.isActive = false;
    return this.ruleRepo.save(rule);
  }
}
