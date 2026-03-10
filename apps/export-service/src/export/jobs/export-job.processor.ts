import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Export, ExportStatus, ExportFormat, Task, Annotation } from '@app/common';
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';
import { IExportFormatter } from '../../formatters/formatter.interface';
import { JsonFormatter } from '../../formatters/json.formatter';
import { JsonlFormatter } from '../../formatters/jsonl.formatter';
import { CsvFormatter } from '../../formatters/csv.formatter';
import { CocoFormatter } from '../../formatters/coco.formatter';
import { PascalVocFormatter } from '../../formatters/pascal-voc.formatter';

const gzipAsync = promisify(gzip);

@Injectable()
export class ExportJobProcessor {
  private readonly logger = new Logger(ExportJobProcessor.name);
  private readonly exportDir = process.env.EXPORT_DIR ?? join(process.cwd(), 'exports');

  private readonly formatterMap: Record<string, IExportFormatter>;

  constructor(
    @InjectRepository(Export)
    private readonly exportRepo: Repository<Export>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Annotation)
    private readonly annotationRepo: Repository<Annotation>,
    @Inject(MESSAGING_SERVICE)
    private readonly messagingService: IMessagingService,
    private readonly jsonFormatter: JsonFormatter,
    private readonly jsonlFormatter: JsonlFormatter,
    private readonly csvFormatter: CsvFormatter,
    private readonly cocoFormatter: CocoFormatter,
    private readonly pascalVocFormatter: PascalVocFormatter,
  ) {
    this.formatterMap = {
      [ExportFormat.JSON]: this.jsonFormatter,
      [ExportFormat.JSONL]: this.jsonlFormatter,
      [ExportFormat.CSV]: this.csvFormatter,
      [ExportFormat.COCO]: this.cocoFormatter,
      [ExportFormat.PASCAL_VOC]: this.pascalVocFormatter,
      [ExportFormat.CUSTOM]: this.jsonFormatter, // fallback
    };
  }

  async processExport(exportId: string): Promise<void> {
    const record = await this.exportRepo.findOne({ where: { id: exportId } });
    if (!record) {
      this.logger.warn(`Export ${exportId} not found — skipping`);
      return;
    }

    try {
      record.status = ExportStatus.PROCESSING;
      await this.exportRepo.save(record);

      const tasks = await this.loadTasks(record);
      const formatter = this.formatterMap[record.format] ?? this.jsonFormatter;
      let buffer = await formatter.format(tasks, record);

      let ext = formatter.fileExtension;
      if (record.configuration?.compression === 'gzip') {
        buffer = Buffer.from(await gzipAsync(buffer));
        ext = `${ext}.gz`;
      }

      const filename = `${record.batchId}.${ext}`;
      const { fileUrl, fileSize } = await this.writeToFile(exportId, filename, buffer);

      record.status = ExportStatus.COMPLETED;
      record.fileUrl = fileUrl;
      record.fileSize = String(fileSize);
      record.recordCount = tasks.length;
      record.completedAt = new Date();
      record.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await this.exportRepo.save(record);

      await this.messagingService.publish('export.completed', {
        exportId: record.id,
        batchId: record.batchId,
        projectId: record.projectId,
        fileUrl: record.fileUrl,
        format: record.format,
        recordCount: record.recordCount,
        requestedBy: record.requestedBy,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Export ${exportId} completed: ${tasks.length} tasks, ${fileSize} bytes`);
    } catch (err) {
      this.logger.error(`Export ${exportId} failed: ${(err as Error).message}`);
      record.status = ExportStatus.FAILED;
      record.errorMessage = (err as Error).message;
      await this.exportRepo.save(record);

      await this.messagingService.publish('export.failed', {
        exportId: record.id,
        batchId: record.batchId,
        projectId: record.projectId,
        error: (err as Error).message,
        requestedBy: record.requestedBy,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async loadTasks(record: Export): Promise<Task[]> {
    const filter = record.filterCriteria ?? {};
    const includeQC = record.configuration?.includeQualityMetrics ?? false;

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.annotations', 'annotation')
      .where('task.batch_id = :batchId', { batchId: record.batchId });

    if (filter.taskStatus?.length) {
      qb.andWhere('task.status IN (:...statuses)', { statuses: filter.taskStatus });
    }
    if (filter.annotatorIds?.length) {
      qb.andWhere('annotation.user_id IN (:...annotatorIds)', { annotatorIds: filter.annotatorIds });
    }
    if (filter.dateRange?.from) {
      qb.andWhere('annotation.submitted_at >= :from', { from: new Date(filter.dateRange.from) });
    }
    if (filter.dateRange?.to) {
      qb.andWhere('annotation.submitted_at <= :to', { to: new Date(filter.dateRange.to) });
    }
    if (includeQC) {
      qb.leftJoinAndSelect('annotation.qualityChecks', 'qualityCheck');
    }

    let tasks = await qb.getMany();

    if (filter.minQualityScore != null && includeQC) {
      tasks = tasks.filter((t) =>
        t.annotations?.some((a) =>
          (a as any).qualityChecks?.some((qc: any) => Number(qc.score) >= filter.minQualityScore),
        ),
      );
    }

    if (record.configuration?.anonymize) {
      tasks = tasks.map((task) => ({
        ...task,
        annotations: task.annotations?.map((a) => ({ ...a, userId: null, assignmentId: null })),
      }));
    }

    return tasks;
  }

  private async writeToFile(
    exportId: string,
    filename: string,
    buffer: Buffer,
  ): Promise<{ fileUrl: string; fileSize: number }> {
    const dir = join(this.exportDir, exportId);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, filename);
    await writeFile(filePath, buffer);
    return { fileUrl: filePath, fileSize: buffer.length };
  }
}
