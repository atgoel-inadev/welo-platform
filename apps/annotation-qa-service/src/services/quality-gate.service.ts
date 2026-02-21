import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QualityCheck, QualityCheckType, QualityCheckStatus, Project, Task, Annotation } from '@app/common';
import { KafkaService } from '../kafka/kafka.service';
import { StateManagementService } from '../state-management/state-management.service';

/**
 * Quality Gate Service
 * Implements quality score checks for stage-based workflows
 * 
 * Features:
 * - Minimum quality score enforcement per project
 * - Stage-specific quality gates
 * - Quality score aggregation across multiple annotators/reviewers
 * - Integration with XState workflow transitions
 * - Automatic rework routing for failing tasks
 */
@Injectable()
export class QualityGateService {
  private readonly logger = new Logger(QualityGateService.name);

  constructor(
    @InjectRepository(QualityCheck)
    private readonly qcRepo: Repository<QualityCheck>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Annotation)
    private readonly annotationRepo: Repository<Annotation>,
    private readonly kafkaService: KafkaService,
    private readonly stateManagement: StateManagementService,
  ) {}

  /**
   * Checks if a task passes quality gates for the current stage
   * Returns pass/fail decision and quality score
   */
  async checkQualityGate(
    taskId: string,
    annotationId: string,
    stageId: string,
  ): Promise<{
    passed: boolean;
    score: number;
    threshold: number;
    issues: any[];
    checkId: string;
  }> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const annotation = await this.annotationRepo.findOne({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    const project = task.project;
    const workflowConfig: any = project.configuration?.workflowConfiguration;

    // Check if quality gates are enabled
    if (!workflowConfig?.enable_quality_gates) {
      this.logger.debug(`Quality gates disabled for project ${project.id}, auto-passing`);
      
      // Create a passing quality check record
      const qc = await this.createQualityCheckRecord(
        taskId,
        annotationId,
        100,
        true,
        'Quality gates disabled',
        [],
        stageId,
      );

      return {
        passed: true,
        score: 100,
        threshold: 0,
        issues: [],
        checkId: qc.id,
      };
    }

    const minimumScore = workflowConfig.minimum_quality_score || 70;
    const qualityScore = this.calculateQualityScore(annotation, task);

    const passed = qualityScore >= minimumScore;
    const issues = passed ? [] : this.generateQualityIssues(qualityScore, minimumScore, annotation);

    // Create quality check record
    const qc = await this.createQualityCheckRecord(
      taskId,
      annotationId,
      qualityScore,
      passed,
      passed
        ? 'Quality gate passed'
        : `Quality score ${qualityScore} below threshold ${minimumScore}`,
      issues,
      stageId,
    );

    this.logger.log(
      `Quality gate check for task ${taskId}: ${passed ? 'PASSED' : 'FAILED'} ` +
        `(score: ${qualityScore}, threshold: ${minimumScore})`,
    );

    // Publish events
    await this.publishQualityGateEvents(task, qc, passed, stageId);

    // Trigger XState workflow event
    await this.triggerWorkflowTransition(taskId, passed, qualityScore, stageId);

    return {
      passed,
      score: qualityScore,
      threshold: minimumScore,
      issues,
      checkId: qc.id,
    };
  }

  /**
   * Checks quality gate for consensus annotations
   * Aggregates quality scores from multiple annotators
   */
  async checkConsensusQualityGate(
    taskId: string,
    annotationIds: string[],
    stageId: string,
  ): Promise<{
    passed: boolean;
    averageScore: number;
    threshold: number;
    individualScores: Array<{ annotationId: string; score: number }>;
    checkId: string;
  }> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const workflowConfig: any = task.project.configuration?.workflowConfiguration;
    const minimumScore = workflowConfig?.minimum_quality_score || 70;

    // Get all annotations
    const annotations = await this.annotationRepo.find({
      where: { id: In(annotationIds) },
    });

    if (annotations.length === 0) {
      throw new NotFoundException('No annotations found for consensus check');
    }

    // Calculate individual scores
    const individualScores = annotations.map((annotation) => ({
      annotationId: annotation.id,
      score: this.calculateQualityScore(annotation, task),
    }));

    // Calculate average score
    const averageScore =
      individualScores.reduce((sum, item) => sum + item.score, 0) / individualScores.length;

    const passed = averageScore >= minimumScore;

    // Create aggregate quality check record
    const issues = passed
      ? []
      : [
          {
            category: 'consensus_quality',
            severity: 'high',
            message: `Consensus quality score ${averageScore.toFixed(2)} below threshold ${minimumScore}`,
            individualScores,
          },
        ];

    const qc = await this.createQualityCheckRecord(
      taskId,
      annotationIds[0], // Primary annotation
      averageScore,
      passed,
      passed
        ? `Consensus quality gate passed (avg: ${averageScore.toFixed(2)})`
        : `Consensus quality score below threshold`,
      issues,
      stageId,
      true, // isConsensus
    );

    this.logger.log(
      `Consensus quality gate for task ${taskId}: ${passed ? 'PASSED' : 'FAILED'} ` +
        `(avg score: ${averageScore.toFixed(2)}, threshold: ${minimumScore})`,
    );

    // Publish events
    await this.publishQualityGateEvents(task, qc, passed, stageId);

    // Trigger workflow transition
    await this.triggerWorkflowTransition(taskId, passed, averageScore, stageId);

    return {
      passed,
      averageScore,
      threshold: minimumScore,
      individualScores,
      checkId: qc.id,
    };
  }

  /**
   * Calculates quality score for an annotation
   * Combines confidence score, completeness, and validation results
   */
  private calculateQualityScore(annotation: Annotation, task: Task): number {
    let score = 0;
    let weights = 0;

    // Confidence score (40% weight)
    if (annotation.confidenceScore !== null && annotation.confidenceScore !== undefined) {
      score += Number(annotation.confidenceScore) * 0.4;
      weights += 0.4;
    }

    // Completeness check (30% weight)
    const completeness = this.calculateCompleteness(annotation, task);
    score += completeness * 0.3;
    weights += 0.3;

    // Data quality validation (30% weight)
    const dataQuality = this.validateDataQuality(annotation);
    score += dataQuality * 0.3;
    weights += 0.3;

    // Normalize score
    return weights > 0 ? (score / weights) * 100 : 0;
  }

  /**
   * Calculates completeness of annotation based on required fields
   */
  private calculateCompleteness(annotation: Annotation, task: Task): number {
    const annotationData = annotation.annotationData || {};
    const requiredFields = this.getRequiredFields(task);

    if (requiredFields.length === 0) {
      return 1; // No required fields, consider complete
    }

    const completedFields = requiredFields.filter((field) => {
      const value = annotationData[field];
      return value !== null && value !== undefined && value !== '';
    });

    return completedFields.length / requiredFields.length;
  }

  /**
   * Validates data quality of annotation
   */
  private validateDataQuality(annotation: Annotation): number {
    const data = annotation.annotationData || {};
    let qualityScore = 1.0;

    // Check for empty or null values in important fields
    const importantFields = Object.keys(data);
    const emptyFields = importantFields.filter((key) => {
      const value = data[key];
      return value === null || value === undefined || value === '';
    });

    if (emptyFields.length > 0) {
      qualityScore -= emptyFields.length / importantFields.length * 0.3;
    }

    // Check for suspiciously short text responses
    const textFields = Object.entries(data).filter(
      ([_, value]) => typeof value === 'string',
    );
    const shortResponses = textFields.filter(([_, value]) => (value as string).length < 3);

    if (shortResponses.length > 0) {
      qualityScore -= shortResponses.length / textFields.length * 0.2;
    }

    return Math.max(0, qualityScore);
  }

  /**
   * Gets required fields from task configuration
   */
  private getRequiredFields(task: Task): string[] {
    // Extract from task metadata or project configuration
    const taskPayload: any = task.dataPayload;
    const taskMetadata = taskPayload?.requiredFields || [];
    return Array.isArray(taskMetadata) ? taskMetadata : [];
  }

  /**
   * Generates quality issues when quality gate fails
   */
  private generateQualityIssues(
    actualScore: number,
    threshold: number,
    annotation: Annotation,
  ): any[] {
    const issues: any[] = [];

    issues.push({
      category: 'quality_score',
      severity: actualScore < threshold * 0.5 ? 'critical' : 'high',
      message: `Quality score ${actualScore.toFixed(2)} is below threshold ${threshold}`,
      details: {
        actualScore,
        threshold,
        deficit: threshold - actualScore,
      },
    });

    // Add specific issues based on annotation data
    if (annotation.confidenceScore && annotation.confidenceScore < 50) {
      issues.push({
        category: 'low_confidence',
        severity: 'medium',
        message: `Low confidence score: ${annotation.confidenceScore}`,
      });
    }

    return issues;
  }

  /**
   * Creates a quality check record in the database
   */
  private async createQualityCheckRecord(
    taskId: string,
    annotationId: string,
    qualityScore: number,
    passed: boolean,
    feedback: string,
    issues: any[],
    stageId: string,
    isConsensus: boolean = false,
  ): Promise<QualityCheck> {
    const qc = this.qcRepo.create({
      taskId,
      annotationId,
      reviewerId: 'quality_gate_system',
      checkType: isConsensus ? QualityCheckType.CONSENSUS : QualityCheckType.AUTOMATED,
      status: passed ? QualityCheckStatus.PASS : QualityCheckStatus.FAIL,
      qualityScore: Math.round(qualityScore * 100) / 100,
      issues,
      feedback,
      metadata: {
        stageId,
        isQualityGate: true,
        timestamp: new Date(),
      },
    });

    return this.qcRepo.save(qc);
  }

  /**
   * Publishes quality gate events to Kafka
   */
  private async publishQualityGateEvents(
    task: Task,
    qc: QualityCheck,
    passed: boolean,
    stageId: string,
  ): Promise<void> {
    const workflowConfig: any = task.project.configuration?.workflowConfiguration;
    
    await this.kafkaService.publishEvent('quality_gate.checked', {
      id: qc.id,
      taskId: task.id,
      projectId: task.projectId,
      stageId,
      passed,
      score: qc.qualityScore,
      threshold: workflowConfig?.minimum_quality_score,
    });

    if (!passed) {
      await this.kafkaService.publishEvent('quality_gate.failed', {
        id: qc.id,
        taskId: task.id,
        stageId,
        score: qc.qualityScore,
        issues: qc.issues,
      });
    }
  }

  /**
   * Triggers XState workflow transition based on quality gate result
   */
  private async triggerWorkflowTransition(
    taskId: string,
    passed: boolean,
    qualityScore: number,
    stageId: string,
  ): Promise<void> {
    const event = passed ? 'QUALITY_PASS' : 'QUALITY_FAIL';
    
    await this.stateManagement.sendWorkflowEvent(taskId, event, {
      qualityScore,
      stageId,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Sent workflow event ${event} for task ${taskId} in stage ${stageId}`,
    );
  }
}

// Add missing import
import { In } from 'typeorm';
