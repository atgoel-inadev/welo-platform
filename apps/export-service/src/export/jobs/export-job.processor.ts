import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Export, ExportStatus, ExportFormat, Task, Annotation, QualityCheck } from '@app/common';
import { KafkaService } from '@app/infrastructure';

const gzipAsync = promisify(gzip);

@Injectable()
export class ExportJobProcessor {
  private readonly logger = new Logger(ExportJobProcessor.name);
  private readonly exportDir = process.env.EXPORT_DIR ?? join(process.cwd(), 'exports');

  constructor(
    @InjectRepository(Export)
    private readonly exportRepo: Repository<Export>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Annotation)
    private readonly annotationRepo: Repository<Annotation>,
    private readonly kafkaService: KafkaService,
  ) {}

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
      let buffer = await this.format(tasks, record);

      let ext = this.getExtension(record.format);
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
      record.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await this.exportRepo.save(record);

      await this.kafkaService.publish('export.completed', {
        exportId: record.id,
        batchId: record.batchId,
        projectId: record.projectId,
        fileUrl: record.fileUrl,
        format: record.format,
        recordCount: record.recordCount,
        requestedBy: record.requestedBy,
      });

      this.logger.log(`Export ${exportId} completed: ${tasks.length} tasks, ${fileSize} bytes`);
    } catch (err) {
      this.logger.error(`Export ${exportId} failed: ${(err as Error).message}`);
      record.status = ExportStatus.FAILED;
      record.errorMessage = (err as Error).message;
      await this.exportRepo.save(record);

      await this.kafkaService.publish('export.failed', {
        exportId: record.id,
        batchId: record.batchId,
        projectId: record.projectId,
        error: (err as Error).message,
        requestedBy: record.requestedBy,
      });
    }
  }

  // ─── Data loading ─────────────────────────────────────────────────────────

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

    // Post-filter by minimum quality score (requires quality checks to be loaded)
    if (filter.minQualityScore != null && includeQC) {
      tasks = tasks.filter((t) =>
        t.annotations?.some((a) =>
          (a as any).qualityChecks?.some((qc: QualityCheck) => Number(qc.score) >= filter.minQualityScore),
        ),
      );
    }

    if (record.configuration?.anonymize) {
      tasks = this.anonymizeTasks(tasks);
    }

    return tasks;
  }

  private anonymizeTasks(tasks: Task[]): Task[] {
    return tasks.map((task) => ({
      ...task,
      annotations: task.annotations?.map((a) => ({ ...a, userId: null, assignmentId: null })),
    }));
  }

  // ─── File writing ──────────────────────────────────────────────────────────

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

  // ─── Formatters ────────────────────────────────────────────────────────────

  private async format(tasks: Task[], record: Export): Promise<Buffer> {
    const includeMeta = record.configuration?.includeMetadata ?? true;

    switch (record.format) {
      case ExportFormat.JSON:
        return this.formatJson(tasks, includeMeta);
      case ExportFormat.JSONL:
        return this.formatJsonl(tasks, includeMeta);
      case ExportFormat.CSV:
        return this.formatCsv(tasks, includeMeta);
      case ExportFormat.COCO:
        return this.formatCoco(tasks, record);
      case ExportFormat.PASCAL_VOC:
        return this.formatPascalVoc(tasks);
      default:
        return this.formatJson(tasks, includeMeta);
    }
  }

  private formatJson(tasks: Task[], includeMeta: boolean): Buffer {
    const data = tasks.map((t) => this.taskToExportRow(t, includeMeta));
    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  private formatJsonl(tasks: Task[], includeMeta: boolean): Buffer {
    const lines = tasks.map((t) => JSON.stringify(this.taskToExportRow(t, includeMeta)));
    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private formatCsv(tasks: Task[], includeMeta: boolean): Buffer {
    const metaCols = includeMeta ? ',taskType,createdAt,updatedAt' : '';
    const header = `id,externalId,status,fileUrl,annotationCount${metaCols},annotationData\n`;

    const rows = tasks.map((t) => {
      const annotations = t.annotations ?? [];
      const annotationData = JSON.stringify(annotations.map((a) => a.annotationData)).replace(/"/g, '""');
      const meta = includeMeta
        ? `,"${t.taskType ?? ''}","${t.createdAt?.toISOString() ?? ''}","${t.updatedAt?.toISOString() ?? ''}"`
        : '';
      return `"${t.id}","${t.externalId ?? ''}","${t.status}","${t.fileUrl ?? ''}",${annotations.length}${meta},"${annotationData}"`;
    });

    return Buffer.from(header + rows.join('\n'), 'utf-8');
  }

  private formatCoco(tasks: Task[], record: Export): Buffer {
    const includeQC = record.configuration?.includeQualityMetrics ?? false;

    const images = tasks.map((t, i) => ({
      id: i + 1,
      file_name: t.fileUrl ?? t.externalId ?? t.id,
      welo_task_id: t.id,
      welo_external_id: t.externalId,
    }));

    const cocoAnnotations: any[] = [];
    let annId = 1;
    tasks.forEach((t, imgIdx) => {
      (t.annotations ?? []).forEach((a) => {
        const entry: any = {
          id: annId++,
          image_id: imgIdx + 1,
          welo_annotation_id: a.id,
          annotation_data: a.annotationData,
          confidence_score: a.confidenceScore,
          version: a.version,
          is_final: a.isFinal,
          submitted_at: a.submittedAt,
        };
        if (includeQC && (a as any).qualityChecks) {
          entry.quality_checks = (a as any).qualityChecks.map((qc: QualityCheck) => ({
            type: qc.type,
            score: qc.score,
            passed: qc.passed,
          }));
        }
        cocoAnnotations.push(entry);
      });
    });

    const coco = {
      info: {
        description: 'Welo Platform Export',
        version: '1.0',
        date_created: new Date().toISOString(),
        batch_id: record.batchId,
        project_id: record.projectId,
      },
      licenses: [],
      images,
      annotations: cocoAnnotations,
      categories: [],
    };

    return Buffer.from(JSON.stringify(coco, null, 2), 'utf-8');
  }

  private formatPascalVoc(tasks: Task[]): Buffer {
    // Generates one VOC XML document per task, bundled as a JSON array of XML strings.
    // In production these would be individual .xml files compressed into a .zip archive.
    const xmlDocs = tasks.map((t) => {
      const annotations = t.annotations ?? [];
      const objects = annotations
        .flatMap((a) => a.annotationData?.labels ?? [])
        .map((label: any) => {
          const bbox = label.bbox ?? {};
          return [
            '<object>',
            `  <name>${this.escapeXml(String(label.label ?? label.name ?? 'unknown'))}</name>`,
            '  <pose>Unspecified</pose>',
            '  <truncated>0</truncated>',
            '  <difficult>0</difficult>',
            '  <bndbox>',
            `    <xmin>${bbox.x ?? 0}</xmin>`,
            `    <ymin>${bbox.y ?? 0}</ymin>`,
            `    <xmax>${(bbox.x ?? 0) + (bbox.width ?? 0)}</xmax>`,
            `    <ymax>${(bbox.y ?? 0) + (bbox.height ?? 0)}</ymax>`,
            '  </bndbox>',
            '</object>',
          ].join('\n');
        });

      return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<annotation>',
        `  <filename>${this.escapeXml(t.fileUrl ?? t.externalId ?? t.id)}</filename>`,
        `  <welo_task_id>${t.id}</welo_task_id>`,
        '  <source><database>Welo Platform</database></source>',
        ...objects,
        '</annotation>',
      ].join('\n');
    });

    return Buffer.from(JSON.stringify(xmlDocs, null, 2), 'utf-8');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private taskToExportRow(task: Task, includeMeta: boolean): Record<string, any> {
    const row: Record<string, any> = {
      id: task.id,
      externalId: task.externalId,
      status: task.status,
      fileUrl: task.fileUrl,
      taskType: task.taskType,
      annotations: (task.annotations ?? []).map((a) => ({
        id: a.id,
        userId: a.userId,
        annotationData: a.annotationData,
        confidenceScore: a.confidenceScore,
        version: a.version,
        isFinal: a.isFinal,
        submittedAt: a.submittedAt,
        timeSpent: a.timeSpent,
        ...((a as any).qualityChecks ? { qualityChecks: (a as any).qualityChecks } : {}),
      })),
    };

    if (includeMeta) {
      row.createdAt = task.createdAt;
      row.updatedAt = task.updatedAt;
      row.metadata = (task as any).metadata ?? null;
    }

    return row;
  }

  private getExtension(format: ExportFormat): string {
    const map: Record<string, string> = {
      [ExportFormat.JSON]: 'json',
      [ExportFormat.JSONL]: 'jsonl',
      [ExportFormat.CSV]: 'csv',
      [ExportFormat.COCO]: 'json',
      [ExportFormat.PASCAL_VOC]: 'json',
      [ExportFormat.CUSTOM]: 'json',
    };
    return map[format] ?? 'json';
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
