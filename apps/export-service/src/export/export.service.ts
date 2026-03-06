import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Export, ExportStatus } from '@app/common';
import { KafkaService } from '@app/infrastructure';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportJobProcessor } from './jobs/export-job.processor';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectRepository(Export)
    private readonly exportRepo: Repository<Export>,
    private readonly kafkaService: KafkaService,
    private readonly jobProcessor: ExportJobProcessor,
  ) {}

  async createExport(dto: CreateExportDto): Promise<Export> {
    const record = this.exportRepo.create({
      batchId: dto.batchId,
      projectId: dto.projectId,
      exportType: dto.exportType,
      format: dto.format,
      requestedBy: dto.requestedBy,
      filterCriteria: dto.filterCriteria ?? null,
      configuration: dto.configuration ?? {},
      status: ExportStatus.PENDING,
    });

    const saved = await this.exportRepo.save(record);
    this.logger.log(`Export job created: ${saved.id} (${dto.format})`);

    // Process asynchronously — in production this would be a Bull queue job
    setImmediate(() => this.jobProcessor.processExport(saved.id));

    return saved;
  }

  async getExport(id: string): Promise<Export> {
    const record = await this.exportRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Export ${id} not found`);
    return record;
  }

  async getDownloadUrl(id: string): Promise<string> {
    const record = await this.getExport(id);
    if (record.status !== ExportStatus.COMPLETED) {
      throw new NotFoundException(`Export ${id} is not yet complete (status: ${record.status})`);
    }
    return record.fileUrl;
  }

  async listExports(
    projectId?: string,
    batchId?: string,
    status?: ExportStatus,
    page = 1,
    limit = 20,
  ): Promise<{ data: Export[]; total: number }> {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (batchId) where.batchId = batchId;
    if (status) where.status = status;

    const [data, total] = await this.exportRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async cancelExport(id: string): Promise<void> {
    const record = await this.getExport(id);
    if (record.status === ExportStatus.COMPLETED || record.status === ExportStatus.CANCELLED) return;
    record.status = ExportStatus.CANCELLED;
    await this.exportRepo.save(record);
    this.logger.log(`Export ${id} cancelled`);
  }

  async retryExport(id: string): Promise<Export> {
    const record = await this.getExport(id);
    if (record.status !== ExportStatus.FAILED) {
      throw new Error(`Only FAILED exports can be retried (current status: ${record.status})`);
    }
    record.status = ExportStatus.PENDING;
    record.errorMessage = null;
    record.completedAt = null;
    const saved = await this.exportRepo.save(record);

    setImmediate(() => this.jobProcessor.processExport(saved.id));
    this.logger.log(`Export ${id} queued for retry`);
    return saved;
  }
}
