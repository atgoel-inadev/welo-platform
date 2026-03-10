import { Injectable, Logger, Inject } from '@nestjs/common';
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';
import { FileRecord } from '../file/file.entity';

@Injectable()
export class FileEventPublisher {
  private readonly logger = new Logger(FileEventPublisher.name);

  constructor(
    @Inject(MESSAGING_SERVICE)
    private readonly messagingService: IMessagingService,
  ) {}

  async publishFileUploaded(file: FileRecord): Promise<void> {
    await this.messagingService.publish('file.uploaded', {
      fileId: file.id,
      fileUrl: file.fileUrl,
      fileKey: file.storageKey,
      projectId: file.projectId,
      batchId: file.batchId ?? null,
      fileType: file.fileType,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      originalName: file.originalName,
      uploadedBy: file.uploadedBy ?? null,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Published file.uploaded for file ${file.id}`);
  }

  async publishFileDeleted(file: FileRecord, deletedBy: string): Promise<void> {
    await this.messagingService.publish('file.deleted', {
      fileId: file.id,
      projectId: file.projectId,
      batchId: file.batchId ?? null,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Published file.deleted for file ${file.id}`);
  }
}
