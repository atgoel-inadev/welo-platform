import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '@app/common';
import { IMessagingService, MESSAGING_SERVICE, MessagePayload } from '@app/infrastructure';

type TopicMeta = { action: AuditAction; entityType: string; idField: string };

const TOPIC_MAP: Record<string, TopicMeta> = {
  'task.created':            { action: AuditAction.CREATE,   entityType: 'TASK',       idField: 'id' },
  'task.assigned':           { action: AuditAction.UPDATE,   entityType: 'TASK',       idField: 'taskId' },
  'task.updated':            { action: AuditAction.UPDATE,   entityType: 'TASK',       idField: 'id' },
  'task.completed':          { action: AuditAction.UPDATE,   entityType: 'TASK',       idField: 'id' },
  'task.submitted':          { action: AuditAction.UPDATE,   entityType: 'TASK',       idField: 'taskId' },
  'task.state_changed':      { action: AuditAction.UPDATE,   entityType: 'TASK',       idField: 'taskId' },
  'batch.created':           { action: AuditAction.CREATE,   entityType: 'BATCH',      idField: 'id' },
  'batch.updated':           { action: AuditAction.UPDATE,   entityType: 'BATCH',      idField: 'id' },
  'batch.completed':         { action: AuditAction.UPDATE,   entityType: 'BATCH',      idField: 'id' },
  'annotation.submitted':    { action: AuditAction.CREATE,   entityType: 'ANNOTATION', idField: 'id' },
  'annotation.updated':      { action: AuditAction.UPDATE,   entityType: 'ANNOTATION', idField: 'id' },
  'quality_check.completed': { action: AuditAction.UPDATE,   entityType: 'QUALITY_CHECK', idField: 'id' },
  'export.completed':        { action: AuditAction.UPDATE,   entityType: 'EXPORT',     idField: 'exportId' },
  'user.registered':         { action: AuditAction.CREATE,   entityType: 'USER',       idField: 'id' },
  'user.logged_in':          { action: AuditAction.ACCESS,   entityType: 'USER',       idField: 'userId' },
  'assignment.created':      { action: AuditAction.CREATE,   entityType: 'ASSIGNMENT', idField: 'id' },
  'assignment.expired':      { action: AuditAction.UPDATE,   entityType: 'ASSIGNMENT', idField: 'assignmentId' },
};

@Injectable()
export class AuditEventHandler implements OnModuleInit {
  private readonly logger = new Logger(AuditEventHandler.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @Inject(MESSAGING_SERVICE)
    private readonly messagingService: IMessagingService,
  ) {}

  async onModuleInit() {
    for (const topic of Object.keys(TOPIC_MAP)) {
      await this.messagingService.subscribe(topic, async (payload: MessagePayload) => {
        try {
          const message = JSON.parse(payload.value.toString());
          await this.handleEvent(topic, message);
        } catch (err) {
          this.logger.warn(`Failed to process audit event [${topic}]: ${(err as Error).message}`);
        }
      });
    }
    this.logger.log(`Subscribed to ${Object.keys(TOPIC_MAP).length} Kafka topics for audit`);
  }

  private async handleEvent(topic: string, payload: any): Promise<void> {
    const meta = TOPIC_MAP[topic];
    if (!meta) return;

    const entityId = payload[meta.idField] ?? payload.id ?? null;
    if (!entityId) {
      this.logger.debug(`No entityId found in payload for topic ${topic}`);
      return;
    }

    const userId =
      payload.userId ??
      payload.requestedBy ??
      payload.assignedTo ??
      null;

    await this.auditRepo.save(
      this.auditRepo.create({
        entityType: meta.entityType,
        entityId,
        action: meta.action,
        userId,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        changes: payload.changes ?? null,
        ipAddress: null,
        userAgent: `kafka/${topic}`,
      }),
    );
  }
}
