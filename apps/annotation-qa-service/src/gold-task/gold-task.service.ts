import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoldTask, Annotation } from '@app/common';
import { CreateGoldTaskDto, UpdateGoldTaskDto, GoldCompareDto } from './dto/gold-task.dto';
import { GoldComparisonEngine } from './gold-comparison.engine';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class GoldTaskService {
  private readonly logger = new Logger(GoldTaskService.name);

  constructor(
    @InjectRepository(GoldTask)
    private readonly goldTaskRepo: Repository<GoldTask>,
    @InjectRepository(Annotation)
    private readonly annotationRepo: Repository<Annotation>,
    private readonly engine: GoldComparisonEngine,
    private readonly kafkaService: KafkaService,
  ) {}

  async create(taskId: string, projectId: string, userId: string, dto: CreateGoldTaskDto) {
    const existing = await this.goldTaskRepo.findOne({ where: { taskId } });
    if (existing) {
      throw new ConflictException(`Gold task already exists for task ${taskId}. Use PATCH to update.`);
    }

    const goldTask = await this.goldTaskRepo.save(
      this.goldTaskRepo.create({
        taskId,
        projectId,
        goldAnnotation: dto.goldAnnotation,
        tolerance: dto.tolerance,
        createdBy: userId,
        isActive: true,
      }),
    );

    this.logger.log(`Gold task created for task ${taskId}`);
    return goldTask;
  }

  async findByTask(taskId: string): Promise<GoldTask | null> {
    return this.goldTaskRepo.findOne({ where: { taskId, isActive: true } });
  }

  async findAllByProject(projectId: string) {
    return this.goldTaskRepo.find({ where: { projectId, isActive: true } });
  }

  async update(taskId: string, dto: UpdateGoldTaskDto) {
    const goldTask = await this.goldTaskRepo.findOne({ where: { taskId } });
    if (!goldTask) throw new NotFoundException(`No gold task found for task ${taskId}`);

    if (dto.goldAnnotation) goldTask.goldAnnotation = dto.goldAnnotation as any;
    if (dto.tolerance) goldTask.tolerance = dto.tolerance as any;

    return this.goldTaskRepo.save(goldTask);
  }

  async compareAnnotation(taskId: string, dto: GoldCompareDto) {
    const goldTask = await this.goldTaskRepo.findOne({ where: { taskId, isActive: true } });
    if (!goldTask) throw new NotFoundException(`No gold task configured for task ${taskId}`);

    const annotation = await this.annotationRepo.findOne({ where: { id: dto.annotationId } });
    if (!annotation) throw new NotFoundException(`Annotation ${dto.annotationId} not found`);

    const result = this.engine.compare(
      annotation.annotationData,
      goldTask.goldAnnotation,
      goldTask.tolerance,
    );

    await this.kafkaService.publishEvent('gold_comparison.completed', {
      id: `gc-${annotation.id}`,
      taskId,
      annotationId: dto.annotationId,
      score: result.overallScore,
      passed: result.overallScore >= ((goldTask.tolerance as any)?.minGoldSimilarity ?? 0.7),
    });

    return result;
  }

  async runComparisonForAnnotation(
    taskId: string,
    annotationData: any,
  ): Promise<{ ran: boolean; score: number; passed: boolean } > {
    const goldTask = await this.findByTask(taskId);
    if (!goldTask) return { ran: false, score: 1.0, passed: true };

    const result = this.engine.compare(
      annotationData,
      goldTask.goldAnnotation,
      goldTask.tolerance,
    );

    const minSimilarity = (goldTask.tolerance as any)?.minGoldSimilarity ?? 0.7;
    return {
      ran: true,
      score: result.overallScore,
      passed: result.overallScore >= minSimilarity,
    };
  }
}
