import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Annotation, AnnotationVersion, Task } from '@app/common';
import { UpdateAnnotationDto, CompareAnnotationsDto } from './dto/annotation.dto';
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';

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
    @Inject(MESSAGING_SERVICE)
    private readonly messagingService: IMessagingService,
  ) {}

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

    await this.messagingService.publishEvent('annotation.updated', {
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
