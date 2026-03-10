import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Export, Batch, ExportType, ExportFormat } from '@app/common';
import { IMessagingService, MESSAGING_SERVICE, MessagePayload } from '@app/infrastructure';
import { ExportService } from '../export.service';

@Injectable()
export class ExportEventHandler implements OnModuleInit {
  private readonly logger = new Logger(ExportEventHandler.name);

  constructor(
    @InjectRepository(Export)
    private readonly exportRepo: Repository<Export>,
    @InjectRepository(Batch)
    private readonly batchRepo: Repository<Batch>,
    @Inject(MESSAGING_SERVICE)
    private readonly messagingService: IMessagingService,
    private readonly exportService: ExportService,
  ) {}

  async onModuleInit() {
    await this.messagingService.subscribe('batch.completed', async (payload: MessagePayload) => {
      const message = JSON.parse(payload.value.toString());
      await this.handleBatchCompleted(message);
    });

    this.logger.log('Export event handler initialized');
  }

  private async handleBatchCompleted(payload: { id?: string; projectId?: string; autoExport?: boolean }) {
    // Only auto-export if the project is configured for it
    if (!payload.autoExport) return;

    const batchId = payload.id;
    const projectId = payload.projectId;
    if (!batchId || !projectId) return;

    try {
      await this.exportService.createExport({
        batchId,
        projectId,
        exportType: ExportType.FULL,
        format: ExportFormat.JSON,
        requestedBy: 'system',
      });
      this.logger.log(`Auto-export triggered for batch ${batchId}`);
    } catch (err) {
      this.logger.error(`Auto-export failed for batch ${batchId}: ${(err as Error).message}`);
    }
  }
}
