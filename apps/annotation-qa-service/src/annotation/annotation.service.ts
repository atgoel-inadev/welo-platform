import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Annotation, AnnotationVersion, Task, Assignment } from '@app/common';
import { SubmitAnnotationDto, UpdateAnnotationDto, CompareAnnotationsDto } from './dto/annotation.dto';
import { KafkaService } from '../kafka/kafka.service';
import { QualityCheckService } from '../quality-check/quality-check.service';

@Injectable()
export class AnnotationService {
  private readonly logger = new Logger(AnnotationService.name);

  constructor(
    @InjectRepository(Annotation)
    private readonly annotationRepo: Repository<Annotation>,
    @InjectRepository(AnnotationVersion)
    private readonly versionRepo: Repository<AnnotationVersion>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    private readonly kafkaService: KafkaService,
    private readonly qualityCheckService: QualityCheckService,
  ) {}

  async submit(taskId: string, userId: string, dto: SubmitAnnotationDto) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    const assignment = await this.assignmentRepo.findOne({
      where: { id: dto.assignmentId, taskId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found for this task');

    // Check if a draft already exists for this annotator on this task
    const existing = await this.annotationRepo.findOne({
      where: { taskId, userId, assignmentId: dto.assignmentId },
    });

    let annotation: Annotation;
    if (existing) {
      // Snapshot previous version before overwriting
      await this.versionRepo.save(
        this.versionRepo.create({
          annotationId: existing.id,
          version: existing.version,
          annotationData: existing.annotationData,
          confidenceScore: existing.confidenceScore,
          changedBy: userId,
          changeReason: dto.isDraft ? 'Draft update' : 'Submitted revision',
        }),
      );

      existing.annotationData = dto.annotationData;
      existing.confidenceScore = dto.confidenceScore;
      existing.timeSpent = dto.timeSpent;
      existing.isFinal = !dto.isDraft;
      existing.version = existing.version + 1;
      if (!dto.isDraft) existing.submittedAt = new Date();
      if (dto.toolVersion) existing.toolVersion = dto.toolVersion;
      annotation = await this.annotationRepo.save(existing);
    } else {
      annotation = await this.annotationRepo.save(
        this.annotationRepo.create({
          taskId,
          assignmentId: dto.assignmentId,
          userId,
          annotationData: dto.annotationData,
          confidenceScore: dto.confidenceScore,
          timeSpent: dto.timeSpent,
          version: 1,
          isFinal: !dto.isDraft,
          submittedAt: dto.isDraft ? null : new Date(),
          toolVersion: dto.toolVersion,
        }),
      );
    }

    if (dto.isDraft) {
      await this.kafkaService.publishEvent('annotation.draft_saved', {
        id: annotation.id,
        taskId,
        userId,
      });
      return { annotationId: annotation.id, taskId, status: 'DRAFT', autoQcTriggered: false };
    }

    // Publish submission event
    await this.kafkaService.publishEvent('annotation.submitted', {
      id: annotation.id,
      taskId,
      userId,
      assignmentId: dto.assignmentId,
    });

    // Trigger automated quality check pipeline
    const qcResult = await this.qualityCheckService.runAutomatedPipeline(
      taskId,
      annotation.id,
      task.projectId,
    );

    return {
      annotationId: annotation.id,
      taskId,
      status: 'SUBMITTED',
      autoQcTriggered: true,
      goldComparisonAvailable: qcResult.goldComparisonRan,
      nextState: qcResult.passed ? 'pendingReview' : 'queued',
      qcSummary: {
        passed: qcResult.passed,
        score: qcResult.score,
      },
    };
  }

  async getAnnotations(taskId: string) {
    const annotations = await this.annotationRepo.find({
      where: { taskId },
      order: { submittedAt: 'DESC' },
    });
    return annotations;
  }

  async update(annotationId: string, userId: string, dto: UpdateAnnotationDto) {
    const annotation = await this.annotationRepo.findOne({ where: { id: annotationId } });
    if (!annotation) throw new NotFoundException(`Annotation ${annotationId} not found`);

    // Save version snapshot
    await this.versionRepo.save(
      this.versionRepo.create({
        annotationId: annotation.id,
        version: annotation.version,
        annotationData: annotation.annotationData,
        confidenceScore: annotation.confidenceScore,
        changedBy: userId,
        changeReason: dto.changeReason || 'Manual update',
      }),
    );

    if (dto.annotationData) annotation.annotationData = dto.annotationData;
    if (dto.confidenceScore !== undefined) annotation.confidenceScore = dto.confidenceScore;
    annotation.version = annotation.version + 1;

    const updated = await this.annotationRepo.save(annotation);

    await this.kafkaService.publishEvent('annotation.updated', {
      id: updated.id,
      taskId: updated.taskId,
      userId,
      version: updated.version,
    });

    return updated;
  }

  async getHistory(annotationId: string) {
    const annotation = await this.annotationRepo.findOne({ where: { id: annotationId } });
    if (!annotation) throw new NotFoundException(`Annotation ${annotationId} not found`);

    const versions = await this.versionRepo.find({
      where: { annotationId },
      order: { version: 'DESC' },
    });
    return { annotation, versions };
  }

  async compare(taskId: string, dto: CompareAnnotationsDto) {
    if (dto.annotationIds.length < 2) {
      throw new BadRequestException('At least 2 annotation IDs are required for comparison');
    }

    const annotations = await this.annotationRepo.findByIds(dto.annotationIds);
    if (annotations.length !== dto.annotationIds.length) {
      throw new NotFoundException('One or more annotations not found');
    }

    // Compute pairwise F1-based agreement
    const [a1, a2] = annotations;
    const agreement = this.computeAgreement(a1.annotationData, a2.annotationData);

    return {
      agreementScore: agreement.f1,
      differences: agreement.differences,
      metrics: {
        precision: agreement.precision,
        recall: agreement.recall,
        f1Score: agreement.f1,
        cohensKappa: agreement.kappa,
      },
    };
  }

  private computeAgreement(data1: any, data2: any) {
    const labels1: string[] = (data1.labels || []).map((l: any) => `${l.label}:${l.start}:${l.end}`);
    const labels2: string[] = (data2.labels || []).map((l: any) => `${l.label}:${l.start}:${l.end}`);

    const set1 = new Set(labels1);
    const set2 = new Set(labels2);
    const intersection = labels1.filter((l) => set2.has(l));

    const precision = set1.size > 0 ? intersection.length / set1.size : 0;
    const recall = set2.size > 0 ? intersection.length / set2.size : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    // Cohen's Kappa (simplified)
    const total = set1.size + set2.size;
    const po = total > 0 ? (2 * intersection.length) / total : 0;
    const pe = 0.5; // Simplified expected agreement
    const kappa = pe < 1 ? (po - pe) / (1 - pe) : 0;

    const differences = [
      ...labels1.filter((l) => !set2.has(l)).map((l) => ({ inFirst: l, inSecond: null })),
      ...labels2.filter((l) => !set1.has(l)).map((l) => ({ inFirst: null, inSecond: l })),
    ];

    return { precision, recall, f1, kappa, differences };
  }
}
