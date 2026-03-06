import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KafkaService } from '@app/infrastructure';
import { FileRecord, FileStatus } from './file.entity';
import { IStorageProvider, STORAGE_PROVIDER } from '../storage/storage.interface';
import * as path from 'path';
import * as crypto from 'crypto';

const FILE_TYPE_MAP: Record<string, string> = {
  'image/jpeg': 'IMAGE', 'image/png': 'IMAGE', 'image/gif': 'IMAGE',
  'image/webp': 'IMAGE', 'image/svg+xml': 'IMAGE',
  'video/mp4': 'VIDEO', 'video/webm': 'VIDEO', 'video/quicktime': 'VIDEO',
  'audio/mpeg': 'AUDIO', 'audio/wav': 'AUDIO', 'audio/ogg': 'AUDIO',
  'application/pdf': 'PDF',
  'text/plain': 'TEXT', 'text/csv': 'CSV',
  'application/json': 'JSON',
};

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRepo: Repository<FileRecord>,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
    private readonly kafkaService: KafkaService,
  ) {}

  async uploadDirect(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    projectId: string,
    batchId?: string,
    uploadedBy?: string,
  ): Promise<FileRecord> {
    const ext = path.extname(originalName);
    const storageKey = `${projectId}/${batchId ?? 'root'}/${crypto.randomUUID()}${ext}`;
    const fileUrl = await this.storage.upload(storageKey, buffer, mimeType);

    const record = this.fileRepo.create({
      projectId,
      batchId: batchId ?? null,
      originalName,
      storageKey,
      fileUrl,
      mimeType,
      fileSize: buffer.length,
      fileType: FILE_TYPE_MAP[mimeType] ?? 'TEXT',
      uploadedBy: uploadedBy ?? null,
      status: FileStatus.READY,
    });

    const saved = await this.fileRepo.save(record);

    await this.kafkaService.publish('file.uploaded', {
      fileId: saved.id,
      fileUrl: saved.fileUrl,
      fileKey: saved.storageKey,
      projectId,
      batchId,
      fileType: saved.fileType,
      originalName,
      uploadedBy,
    });

    this.logger.log(`File uploaded: ${saved.id} (${originalName})`);
    return saved;
  }

  async requestPresignedUrl(dto: {
    fileName: string;
    mimeType: string;
    projectId: string;
    batchId?: string;
    uploadedBy?: string;
  }): Promise<{ uploadUrl: string; fileId: string; fileKey: string; expiresAt: Date }> {
    const ext = path.extname(dto.fileName);
    const storageKey = `${dto.projectId}/${dto.batchId ?? 'root'}/${crypto.randomUUID()}${ext}`;

    const record = this.fileRepo.create({
      projectId: dto.projectId,
      batchId: dto.batchId ?? null,
      originalName: dto.fileName,
      storageKey,
      fileUrl: '',
      mimeType: dto.mimeType,
      fileSize: 0,
      fileType: FILE_TYPE_MAP[dto.mimeType] ?? 'TEXT',
      uploadedBy: dto.uploadedBy ?? null,
      status: FileStatus.PENDING,
    });

    const saved = await this.fileRepo.save(record);
    const ttl = 3600;
    const uploadUrl = await this.storage.presignedPutUrl(storageKey, dto.mimeType, ttl);
    const expiresAt = new Date(Date.now() + ttl * 1000);

    return { uploadUrl, fileId: saved.id, fileKey: storageKey, expiresAt };
  }

  async confirmUpload(fileId: string): Promise<FileRecord> {
    const record = await this.getFile(fileId);
    const fileUrl = await this.storage.presignedGetUrl(record.storageKey, 3600 * 24 * 365);
    record.fileUrl = fileUrl;
    record.status = FileStatus.READY;
    const saved = await this.fileRepo.save(record);

    await this.kafkaService.publish('file.uploaded', {
      fileId: saved.id,
      fileUrl: saved.fileUrl,
      fileKey: saved.storageKey,
      projectId: saved.projectId,
      batchId: saved.batchId,
      fileType: saved.fileType,
      originalName: saved.originalName,
      uploadedBy: saved.uploadedBy,
    });

    return saved;
  }

  async getFile(id: string): Promise<FileRecord> {
    const record = await this.fileRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`File ${id} not found`);
    return record;
  }

  async listFiles(
    projectId: string,
    batchId?: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: FileRecord[]; total: number }> {
    const where: any = { projectId, status: FileStatus.READY };
    if (batchId) where.batchId = batchId;

    const [data, total] = await this.fileRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async getDownloadUrl(id: string): Promise<string> {
    const record = await this.getFile(id);
    return this.storage.presignedGetUrl(record.storageKey, 3600);
  }

  async deleteFile(id: string, requestedBy: string): Promise<void> {
    const record = await this.getFile(id);
    await this.storage.delete(record.storageKey);
    record.status = FileStatus.DELETED;
    await this.fileRepo.save(record);

    await this.kafkaService.publish('file.deleted', {
      fileId: record.id,
      projectId: record.projectId,
      batchId: record.batchId,
      deletedBy: requestedBy,
    });

    this.logger.log(`File deleted: ${id} by ${requestedBy}`);
  }
}
