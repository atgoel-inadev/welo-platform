import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Annotation, Task } from '@app/common';
import { KafkaService } from '@app/infrastructure';
import { QualityCheckService } from '../quality-check/quality-check.service';

/**
 * Subscribes to annotation.submitted Kafka events published by task-management.
 * Triggers the automated QC pipeline without exposing a direct HTTP submission endpoint.
 */
@Injectable()
export class AnnotationEventHandler implements OnModuleInit {
  private readonly logger = new Logger(AnnotationEventHandler.name);

  constructor(
    @InjectRepository(Annotation)
    private readonly annotationRepo: Repository<Annotation>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly kafkaService: KafkaService,
    private readonly qualityCheckService: QualityCheckService,
  ) {}

  async onModuleInit() {
    await this.kafkaService.subscribe('annotation.submitted', async (payload) => {
      try {
        const message = JSON.parse(payload.message.value.toString());
        await this.handleAnnotationSubmitted(message);
      } catch (error) {
        this.logger.error(`Failed to process annotation.submitted event: ${error.message}`, error.stack);
      }
    });

    this.logger.log('Subscribed to annotation.submitted events');
  }

  private async handleAnnotationSubmitted(message: {
    id: string;
    taskId: string;
    userId: string;
    assignmentId: string;
    isFinal?: boolean;
  }): Promise<void> {
    // Ignore draft saves — only process final submissions
    if (message.isFinal === false) {
      return;
    }

    const annotation = await this.annotationRepo.findOne({ where: { id: message.id } });
    if (!annotation) {
      this.logger.warn(`Annotation ${message.id} not found — may have been deleted`);
      return;
    }

    const task = await this.taskRepo.findOne({ where: { id: message.taskId } });
    if (!task) {
      this.logger.warn(`Task ${message.taskId} not found for annotation ${message.id}`);
      return;
    }

    this.logger.log(`Running automated QC pipeline for annotation ${annotation.id} on task ${task.id}`);

    await this.qualityCheckService.runAutomatedPipeline(
      task.id,
      annotation.id,
      task.projectId,
    );
  }
}
