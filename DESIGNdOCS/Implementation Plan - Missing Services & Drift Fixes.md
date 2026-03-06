# Welo Platform — Low-Level Implementation Plan
## Missing Services + Drift Fixes

**Covers**:
- Part A: Drift fixes (5 targeted changes to existing services)
- Part B: 5 new NestJS microservices (File Storage, Export, Notification, Analytics, Audit)

**Monorepo port assignments**:

| Service | Port | Status |
|---------|------|--------|
| workflow-engine | 3001 | Existing |
| auth-service | 3002 | Existing |
| task-management | 3003 | Existing |
| project-management | 3004 | Existing |
| annotation-qa-service | 3005 | Existing |
| file-storage-service | **3006** | New |
| export-service | **3007** | New |
| notification-service | **3008** | New |
| analytics-service | **3009** | New |
| audit-service | **3010** | New |

---

# PART A — DRIFT FIXES

---

## A1. Remove Duplicate `BatchController` from task-management

### Files to change

**DELETE**: `apps/task-management/src/batch/batch.controller.ts`
**DELETE**: `apps/task-management/src/batch/` (entire folder if empty after deletion)

**EDIT**: `apps/task-management/src/app.module.ts`

```ts
// REMOVE these two lines:
import { BatchController } from './batch/batch.controller';
// controllers: [TaskController, BatchController]  ← remove BatchController

// KEEP Batch in TypeOrmModule.forFeature — TaskService still needs the repo
```

### Verification
After deletion, `GET /batches` on port 3003 returns 404. All batch operations go through port 3004 (project-management). No TaskService changes required — it already injects `batchRepository` directly.

---

## A2. Unify Annotation Submission — Remove Duplicate from annotation-qa-service

### Context
`annotation-qa-service` `AnnotationController` has `POST /tasks/:taskId/annotations` (submit). This duplicates task-management's `POST /tasks/:id/submit`. Fix: remove the submit endpoint; wire annotation-qa-service to react to Kafka instead.

### Files to change

**EDIT**: `apps/annotation-qa-service/src/annotation/annotation.controller.ts`

```ts
// REMOVE this endpoint entirely:
@Post('tasks/:taskId/annotations')
async submit(...) { ... }

// KEEP these read/comparison endpoints:
// GET  /tasks/:taskId/annotations
// PATCH /annotations/:annotationId
// GET  /annotations/:annotationId/history
// POST /tasks/:taskId/annotations/compare
```

**EDIT**: `apps/annotation-qa-service/src/annotation/annotation.service.ts`

```ts
// REMOVE: submit() method
// REMOVE: AnnotationVersion, Assignment repository injections used only by submit()

// ADD Kafka consumer method — annotation-qa-service now reacts to task-management's event:
@EventPattern('annotation.submitted')
async handleAnnotationSubmitted(payload: {
  annotationId: string;
  taskId: string;
  assignmentId: string;
  userId: string;
  isFinal: boolean;
}): Promise<void> {
  if (!payload.isFinal) return; // ignore drafts
  const annotation = await this.annotationRepo.findOne({ where: { id: payload.annotationId } });
  if (!annotation) return;
  const task = await this.taskRepo.findOne({ where: { id: payload.taskId } });
  await this.qualityCheckService.runAutomatedChecks(annotation, task);
}
```

**EDIT**: annotation-qa-service `app.module.ts` — add `'annotation.submitted'` to Kafka topics array.

### Clarify autosave vs final submit in task-management

`POST /tasks/:id/annotation` (`saveAnnotation` in TaskService) = autosave to `task.annotationResponses` JSONB
`POST /tasks/:id/submit` (`submitTask` in TaskService) = creates `Annotation` record + publishes `annotation.submitted`

Add a JSDoc comment to `saveAnnotation` in `task.service.ts`:
```ts
/**
 * Autosave / draft path. Writes to task.annotationResponses JSONB only.
 * Does NOT create an Annotation record. Does NOT trigger QC.
 * For final submission use submitTask() → POST /tasks/:id/submit
 */
async saveAnnotation(taskId: string, userId: string, dto: SaveAnnotationDto): Promise<Task>
```

---

## A3. Remove Public XState Event Endpoint from task-management

### Files to change

**EDIT**: `apps/task-management/src/task/task.controller.ts`

```ts
// DELETE this entire handler (lines ~138-144):
@Post(':id/events')
@ApiOperation({ summary: 'Send event to task (XState transition)' })
async sendEvent(@Param('id') id: string, @Body() dto: TaskTransitionDto) {
  return this.taskService.sendEvent(id, dto);
}
```

**EDIT**: `apps/task-management/src/task/task.service.ts`

```ts
// Make sendEvent private. Add deprecation comment:
/**
 * @internal DEPRECATED for external use. Direct machineState mutation for
 * simple status sync only. External callers must use:
 *   workflow-engine POST /tasks/:id/events (port 3001)
 */
private async sendEvent(taskId: string, dto: TaskTransitionDto): Promise<Task>
```

Remove `sendEvent` from the `TaskService` public interface. Remove `TaskTransitionDto` from the controller import if no longer used.

---

## A4. AuditLog Interceptor (Write to audit_logs automatically)

### New file: `libs/common/src/interceptors/audit.interceptor.ts`

```ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditAction } from '../enums';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      return next.handle();
    }

    const action = this.mapMethod(req.method);
    const userId = req.user?.userId ?? req.headers['x-user-id'] ?? null;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const entityId = response?.id ?? req.params?.id ?? null;
          const entityType = this.extractEntityType(req.path);
          if (!entityId || entityId === 'undefined') return;

          await this.auditRepo.save(
            this.auditRepo.create({
              entityType,
              entityId,
              action,
              userId,
              timestamp: new Date(),
              ipAddress: req.ip ?? req.headers['x-forwarded-for'],
              userAgent: req.headers['user-agent'],
              changes: action === AuditAction.UPDATE && response
                ? { before: {}, after: response }   // extend with before/after if needed
                : undefined,
            }),
          );
        } catch (err) {
          // Audit failures must never break the request
        }
      }),
    );
  }

  private mapMethod(method: string): AuditAction {
    return { POST: AuditAction.CREATE, PATCH: AuditAction.UPDATE,
             PUT: AuditAction.UPDATE, DELETE: AuditAction.DELETE }[method];
  }

  private extractEntityType(path: string): string {
    const segments = path.replace(/^\/api\/v\d+\//, '').split('/');
    return (segments[0] ?? 'UNKNOWN').toUpperCase().replace(/S$/, '');
  }
}
```

**EDIT**: `libs/common/src/interceptors/index.ts`
```ts
export * from './audit.interceptor';
```

**EDIT**: Each app module that needs auditing — add to `providers`:
```ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '@app/common/interceptors';

providers: [
  // ... existing providers
  { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
]
```

Also add `AuditLog` to each app's `TypeOrmModule.forFeature([...])` array.

---

## A5. Queue Controller in project-management

### New file: `apps/project-management/src/controllers/queue.controller.ts`

```ts
@ApiTags('queues')
@Controller('queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()                                   // Create queue config for a project
  async createQueue(@Body() dto: CreateQueueDto): Promise<Queue>

  @Get()                                    // List queues, filter by projectId
  async listQueues(@Query('projectId') projectId?: string): Promise<Queue[]>

  @Get(':id')
  async getQueue(@Param('id') id: string): Promise<Queue>

  @Patch(':id')
  async updateQueue(@Param('id') id: string, @Body() dto: UpdateQueueDto): Promise<Queue>

  @Post(':id/pause')                        // Set status = PAUSED (stops auto-assign)
  async pauseQueue(@Param('id') id: string): Promise<Queue>

  @Post(':id/resume')                       // Set status = ACTIVE
  async resumeQueue(@Param('id') id: string): Promise<Queue>

  @Get(':id/size')                          // Live task count from Redis
  async getQueueSize(@Param('id') id: string): Promise<{ size: number; projectId: string; queueType: string }>
}
```

### New file: `apps/project-management/src/services/queue.service.ts`

```ts
@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(Queue) private queueRepo: Repository<Queue>,
    private redis: RedisService,
  ) {}

  async createQueue(dto: CreateQueueDto): Promise<Queue>
  async listQueues(projectId?: string): Promise<Queue[]>
  async getQueue(id: string): Promise<Queue>
  async updateQueue(id: string, dto: UpdateQueueDto): Promise<Queue>
  async pauseQueue(id: string): Promise<Queue>       // status = PAUSED
  async resumeQueue(id: string): Promise<Queue>      // status = ACTIVE
  async getSize(id: string): Promise<number> {
    const queue = await this.getQueue(id);
    // Redis key matches TaskQueueService schema: task_queue:{projectId}:{queueType}
    return this.redis.zcard(`task_queue:${queue.projectId}:${queue.queueType}`);
  }
}
```

Register `QueueController` and `QueueService` in `project-management.module.ts`.
Add `Queue` to `TypeOrmModule.forFeature([...])`.

---

# PART B — NEW MICROSERVICES

All new services follow the same NestJS monorepo pattern:
- `apps/{service-name}/src/main.ts` — bootstrap on assigned port
- `apps/{service-name}/src/app.module.ts` — TypeORM + Kafka + Redis + HealthModule
- `apps/{service-name}/tsconfig.app.json` — extends root tsconfig
- Entry in root `nest-cli.json` under `projects`

Shared infrastructure: `@app/common` (entities, enums), `@app/infrastructure` (KafkaModule, RedisModule, HealthModule)

---

## B1. File Storage Service (Port 3006)

### Responsibility
File upload (local disk in dev, S3 in production), presigned URL generation, file metadata management, file serving.

### Directory structure
```
apps/file-storage-service/
  src/
    main.ts
    app.module.ts
    file/
      file.controller.ts       ← HTTP endpoints
      file.service.ts          ← business logic
      dto/
        upload-file.dto.ts
        confirm-upload.dto.ts
        presigned-url.dto.ts
      file.entity.ts           ← File metadata entity (NOT in libs/common — owned by this service)
    storage/
      storage.interface.ts     ← IStorageProvider interface
      local-storage.provider.ts ← dev: disk writes
      s3-storage.provider.ts    ← production: AWS S3
    events/
      file-event.publisher.ts  ← publishes file.uploaded, file.deleted
```

### `file.entity.ts` (service-owned, not in libs/common)
```ts
@Entity('files')
export class FileRecord extends BaseEntity {
  projectId: string;          // FK → projects.id
  batchId: string;            // nullable FK → batches.id
  originalName: string;       // e.g. "image_001.jpg"
  storageKey: string;         // S3 key or local relative path
  fileUrl: string;            // accessible URL
  mimeType: string;           // "image/jpeg"
  fileSize: number;           // bytes
  fileType: string;           // CSV | IMAGE | VIDEO | AUDIO | PDF | TXT
  uploadedBy: string;         // userId
  status: enum PENDING | READY | VIRUS_DETECTED | DELETED
  virusScanResult: string;    // nullable
  thumbnailUrl: string;       // nullable — for images/videos
  metadata: JSONB;            // width, height, duration, etc.
}
```

### `IStorageProvider` interface
```ts
interface IStorageProvider {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;     // returns fileUrl
  presignedPutUrl(key: string, mimeType: string, ttlSeconds: number): Promise<string>;
  presignedGetUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

### `file.controller.ts` — Endpoints
```
POST   /files/upload           multipart/form-data — direct upload (dev mode)
                               Body: file + projectId + batchId?
                               Returns: FileRecord

POST   /files/presigned-url    Request presigned S3 PUT URL (production)
                               Body: { fileName, mimeType, projectId, batchId? }
                               Returns: { uploadUrl, fileId, fileKey, expiresAt }

POST   /files/:id/confirm      Mark upload complete after client-side S3 PUT
                               Returns: FileRecord with fileUrl

GET    /files/:id              Get file metadata
GET    /files                  List files, filter by projectId/batchId
GET    /files/:id/download     Presigned GET URL or redirect to CDN
DELETE /files/:id              Soft-delete, publishes file.deleted event

GET    /files/health           Health check (storage connectivity)
```

### `file.service.ts` — Methods
```ts
uploadDirect(file: Express.Multer.File, projectId: string, batchId?: string): Promise<FileRecord>
requestPresignedUrl(dto: PresignedUrlDto): Promise<{ uploadUrl; fileId; fileKey; expiresAt }>
confirmUpload(fileId: string): Promise<FileRecord>
getFile(id: string): Promise<FileRecord>
listFiles(projectId: string, batchId?: string, page?: number): Promise<{ data: FileRecord[]; total: number }>
getDownloadUrl(id: string): Promise<string>
deleteFile(id: string, requestedBy: string): Promise<void>
```

### Kafka events published
```
file.uploaded   { fileId, fileUrl, fileKey, projectId, batchId, fileType, originalName, uploadedBy }
file.deleted    { fileId, projectId, batchId }
```

### `app.module.ts` config
```ts
TypeOrmModule.forFeature([FileRecord])
KafkaModule.forRoot({ clientId: 'file-storage-service', topics: ['file.uploaded', 'file.deleted'] })
// Storage provider — switch via env:
{ provide: 'STORAGE_PROVIDER',
  useClass: process.env.STORAGE_TYPE === 's3' ? S3StorageProvider : LocalStorageProvider }
```

### Environment variables
```
STORAGE_TYPE=local|s3
MEDIA_FILES_PATH=/app/media           # for LocalStorageProvider
AWS_BUCKET=welo-files
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
CDN_BASE_URL=https://cdn.example.com  # prepended to S3 keys for public URLs
FILE_STORAGE_SERVICE_PORT=3006
```

### Migration note
Update `project-management` `MediaController`:
- `GET /media/:projectId/:batchName/:filename` — keep as-is (local dev fallback)
- **ADD**: `GET /media/:projectId/:batchName/:filename` proxies to file-storage-service by constructing the storageKey

---

## B2. Export Service (Port 3007)

### Responsibility
Accepts export requests, runs async jobs to aggregate annotation data, formats output (JSON/JSONL/CSV/COCO/PASCAL_VOC), stores result in S3, updates Export record.

### Directory structure
```
apps/export-service/
  src/
    main.ts
    app.module.ts
    export/
      export.controller.ts
      export.service.ts          ← orchestrates export jobs
      dto/
        create-export.dto.ts
        export-filter.dto.ts
    formatters/
      formatter.interface.ts     ← IExportFormatter
      json.formatter.ts
      jsonl.formatter.ts
      csv.formatter.ts
      coco.formatter.ts
      pascal-voc.formatter.ts
    jobs/
      export-job.processor.ts    ← Bull queue processor
    events/
      export-event.handler.ts    ← Kafka: batch.completed → trigger auto-export
```

### `export.controller.ts` — Endpoints
```
POST   /exports                 Request new export
                                Body: CreateExportDto
                                Returns: Export (status=PENDING, job queued)

GET    /exports/:id             Poll export status
GET    /exports/:id/download    Returns presigned S3 download URL (when COMPLETED)
GET    /exports                 List exports, filter by batchId/projectId/status
DELETE /exports/:id             Cancel or delete export record
```

### `CreateExportDto`
```ts
class CreateExportDto {
  batchId: string;
  projectId: string;
  exportType: ExportType;          // FULL | INCREMENTAL | FILTERED
  format: ExportFormat;            // JSON | JSONL | CSV | COCO | PASCAL_VOC | CUSTOM
  requestedBy: string;
  filterCriteria?: {
    taskStatus?: string[];
    annotatorIds?: string[];
    dateRange?: { from: Date; to: Date };
    minQualityScore?: number;
  };
  configuration?: {
    includeMetadata: boolean;
    includeQualityMetrics: boolean;
    anonymize: boolean;
    compression: 'none' | 'gzip' | 'zip';
  };
}
```

### `export.service.ts` — Methods
```ts
createExport(dto: CreateExportDto): Promise<Export>
  // 1. Validate batchId/projectId exist (HTTP call to project-management or direct DB read)
  // 2. Create Export record with status=PENDING
  // 3. Enqueue Bull job: exportQueue.add('process-export', { exportId })
  // 4. Return Export record

getExport(id: string): Promise<Export>
getDownloadUrl(id: string): Promise<string>  // presigned S3 GET URL, 1hr TTL
listExports(filter: ExportFilterDto): Promise<{ data: Export[]; total: number }>
cancelExport(id: string): Promise<void>
```

### `export-job.processor.ts` (Bull @Process)
```ts
@Process('process-export')
async processExport(job: Job<{ exportId: string }>): Promise<void> {
  // 1. Load Export record, set status=PROCESSING
  // 2. Load all approved/submitted Tasks for the batch with their Annotations
  //    (paginated: 500 tasks at a time using cursor-based pagination)
  // 3. For each task: join annotations, annotationResponses, qualityChecks
  // 4. Call formatter.format(tasks, config) → Buffer
  // 5. If compression configured: compress buffer (zlib)
  // 6. Upload to S3: key = exports/{exportId}/{batchId}.{ext}
  // 7. Update Export: status=COMPLETED, fileUrl, fileSize, recordCount, completedAt
  //    expiresAt = now + 30 days
  // 8. Publish export.completed Kafka event
  // On error: set status=FAILED, errorMessage, publish export.failed
}
```

### `IExportFormatter` interface
```ts
interface IExportFormatter {
  format(tasks: TaskWithAnnotations[], config: ExportConfiguration): Promise<Buffer>;
  mimeType: string;
  fileExtension: string;
}
```

### `coco.formatter.ts` (example of complex format)
```ts
// Produces COCO JSON structure:
// { info, licenses, images[], annotations[], categories[] }
// images: task.externalId → COCO image record
// annotations: annotationData.labels/spans → COCO annotation records
// categories: from project.configuration.annotationQuestions[].options
```

### Kafka events consumed
```
batch.completed  → trigger auto-export if project.configuration.exportSettings.autoExport = true
```

### Kafka events published
```
export.completed  { exportId, batchId, projectId, fileUrl, format, recordCount }
export.failed     { exportId, batchId, error }
export.expired    { exportId }   (from a daily cron job)
```

### Environment variables
```
EXPORT_SERVICE_PORT=3007
EXPORT_QUEUE_REDIS_HOST=localhost   # Bull uses Redis
AWS_BUCKET=welo-exports
EXPORT_EXPIRY_DAYS=30
MAX_EXPORT_TASKS_PER_PAGE=500
```

### `app.module.ts` additions
```ts
BullModule.registerQueue({ name: 'export' })
TypeOrmModule.forFeature([Export, Task, Annotation, AnnotationResponse, QualityCheck, Batch, Project])
KafkaModule.forRoot({ clientId: 'export-service', topics: ['batch.completed', 'export.completed', 'export.failed'] })
```

---

## B3. Notification Service (Port 3008)

### Responsibility
Receives `notification.send` Kafka events from all services, persists to `notifications` table, delivers via email (SES/SendGrid), in-app (REST polling), and real-time (WebSocket/SSE). Also manages webhook delivery.

### Directory structure
```
apps/notification-service/
  src/
    main.ts
    app.module.ts
    notification/
      notification.controller.ts   ← REST: list, mark-read, preferences
      notification.service.ts      ← persistence + dispatch
      dto/
        notification-filter.dto.ts
        mark-read.dto.ts
    channels/
      channel.interface.ts         ← INotificationChannel
      email.channel.ts             ← SES/SendGrid
      inapp.channel.ts             ← save to DB only
      webhook.channel.ts           ← HTTP POST to registered webhooks
    events/
      notification-event.handler.ts ← Kafka consumer for notification.send
    realtime/
      notification.gateway.ts      ← WebSocket gateway (Socket.io)
    webhook/
      webhook.controller.ts        ← CRUD for webhook registrations
      webhook.entity.ts            ← webhook config table (service-owned)
      webhook-delivery.entity.ts   ← delivery log table
```

### `notification-event.handler.ts` — Kafka consumer
```ts
// Subscribes to: notification.send, task.assigned, task.expired,
//                batch.completed, assignment.expired, export.completed

@EventPattern('notification.send')
async handleNotification(payload: NotificationPayload): Promise<void> {
  // 1. Save Notification record to DB
  // 2. Dispatch via configured channels based on user preferences
  //    - Always: in-app (DB)
  //    - If user.notificationPreferences.email: email channel
  //    - If webhooks registered for this event type: webhook channel
  // 3. Emit to WebSocket gateway for real-time delivery
}

// Convenience handlers that map business events to notifications:
@EventPattern('task.assigned')
async handleTaskAssigned(payload) { /* map to NotificationPayload, call handleNotification */ }

@EventPattern('assignment.expired')
async handleAssignmentExpired(payload) { /* TASK_EXPIRED notification to user */ }

@EventPattern('batch.completed')
async handleBatchCompleted(payload) { /* BATCH_COMPLETED to project manager */ }

@EventPattern('export.completed')
async handleExportCompleted(payload) { /* download link email to requester */ }
```

### `notification.controller.ts` — Endpoints
```
GET    /notifications              List notifications for user (via x-user-id header)
                                   Query: ?isRead=false&page=1&limit=20
POST   /notifications/:id/read     Mark single notification as read
POST   /notifications/read-all     Mark all as read for user
DELETE /notifications/:id          Delete notification
GET    /notifications/preferences  Get user notification preferences
PUT    /notifications/preferences  Update preferences
```

### `notification.gateway.ts` — WebSocket
```ts
@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationGateway {
  @WebSocketServer() server: Server;

  // Client connects with JWT in handshake auth
  // Server emits 'notification' event to user-specific room

  emitToUser(userId: string, notification: Notification): void {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
```

### `INotificationChannel` interface
```ts
interface INotificationChannel {
  name: string;
  send(notification: Notification, user: Partial<User>): Promise<void>;
}
```

### `email.channel.ts` (SES)
```ts
// Uses @aws-sdk/client-ses or @sendgrid/mail
// Template mapping: NotificationType → email template
// TASK_ASSIGNED → "You have a new task: {task.externalId}"
// BATCH_COMPLETED → "Batch {batch.name} is complete. Export is ready."
// etc.
```

### `webhook.entity.ts` (service-owned)
```ts
@Entity('webhooks')
export class Webhook extends BaseEntity {
  projectId: string;
  url: string;                    // target URL
  secret: string;                 // HMAC signing secret
  events: string[];               // JSONB: ['task.assigned', 'batch.completed']
  isActive: boolean;
  failureCount: number;           // disable after 5 consecutive failures
  lastDeliveredAt: Date;
}
```

### `webhook.controller.ts` — Endpoints
```
GET    /webhooks                   List webhooks for project
POST   /webhooks                   Register webhook
PATCH  /webhooks/:id               Update
DELETE /webhooks/:id               Remove
POST   /webhooks/:id/test          Send test payload
GET    /webhooks/:id/deliveries    Delivery history
```

### Webhook delivery logic
```ts
// In webhook.channel.ts:
// 1. POST to webhook.url with JSON payload
// 2. Add HMAC-SHA256 signature header: X-Welo-Signature
// 3. On HTTP 2xx: log success, reset failureCount
// 4. On failure: retry up to 3 times with exponential backoff (1s, 5s, 30s)
// 5. After 5 consecutive failures: set webhook.isActive = false, notify PM
```

### Kafka topics consumed
```
notification.send, task.assigned, task.expired, assignment.expired,
batch.completed, export.completed, quality_check.failed
```

### Environment variables
```
NOTIFICATION_SERVICE_PORT=3008
EMAIL_PROVIDER=ses|sendgrid
SES_REGION=us-east-1
SENDGRID_API_KEY=...
FROM_EMAIL=noreply@welo.ai
WEBHOOK_RETRY_DELAYS=1000,5000,30000
```

---

## B4. Analytics Service (Port 3009)

### Responsibility
Read-only aggregation service. Queries the shared PostgreSQL database (read replica in production) to produce dashboard metrics, productivity analytics, quality trends, and project progress reports.

### Directory structure
```
apps/analytics-service/
  src/
    main.ts
    app.module.ts
    dashboard/
      dashboard.controller.ts
      dashboard.service.ts
    productivity/
      productivity.controller.ts
      productivity.service.ts
    quality/
      quality.controller.ts
      quality.service.ts
    project/
      project-analytics.controller.ts
      project-analytics.service.ts
    events/
      analytics-event.handler.ts    ← Kafka: update cached metrics on relevant events
```

### `dashboard.controller.ts` — Endpoints
```
GET /analytics/dashboard
    Query: ?projectId=&customerId=&dateFrom=&dateTo=
    Returns: {
      activeProjects, totalBatches, totalTasks,
      completedToday, avgQualityScore, avgThroughputPerHour,
      topAnnotators[{ userId, name, completedToday, avgQuality }],
      batchProgress[{ batchId, name, completion% }]
    }
```

### `productivity.controller.ts` — Endpoints
```
GET /analytics/productivity
    Query: ?userId=&projectId=&dateFrom=&dateTo=
    Returns per-user: {
      tasksCompleted, avgTimePerTask, avgQualityScore,
      dailySeries[{ date, completed, avgTime }]
    }

GET /analytics/capacity
    Query: ?projectId=
    Returns: {
      totalAnnotators, activeToday, avgConcurrentTasks,
      estimatedCompletionDate (based on current throughput)
    }
```

### `quality.controller.ts` — Endpoints
```
GET /analytics/quality-trends
    Query: ?projectId=&batchId=&dateFrom=&dateTo=
    Returns: {
      overallScore, trendSeries[{ date, avgScore, passRate }],
      issueBreakdown[{ category, count, severity }],
      interAnnotatorAgreement
    }

GET /analytics/quality/by-annotator
    Query: ?projectId=&dateFrom=&dateTo=
    Returns: [{ userId, name, avgScore, submitCount, rejectRate }]
```

### `project-analytics.controller.ts` — Endpoints
```
GET /analytics/projects/:id/progress
    Returns: {
      batchBreakdown[{ batchId, name, totalTasks, completed, inProgress, queued }],
      workflowStageDistribution,
      projectedEndDate
    }

GET /analytics/transitions
    Query: ?entityType=TASK&entityId=&dateFrom=&dateTo=
    Returns state_transitions history (delegates to StateTransition table)
```

### Key SQL patterns in analytics services

**Dashboard aggregate (dashboard.service.ts):**
```sql
-- Active projects count
SELECT COUNT(*) FROM projects WHERE status = 'ACTIVE';

-- Tasks completed today
SELECT COUNT(*) FROM tasks
WHERE status IN ('APPROVED','SUBMITTED')
  AND submitted_at >= CURRENT_DATE;

-- Average quality (last 7 days)
SELECT AVG(quality_score) FROM quality_checks
WHERE status = 'PASS' AND created_at >= NOW() - INTERVAL '7 days';

-- Top annotators (today)
SELECT a.user_id, COUNT(*) as completed, AVG(qc.quality_score) as avg_quality
FROM assignments a
JOIN tasks t ON t.id = a.task_id
LEFT JOIN quality_checks qc ON qc.task_id = t.id
WHERE a.status = 'COMPLETED' AND DATE(a.completed_at) = CURRENT_DATE
GROUP BY a.user_id
ORDER BY completed DESC
LIMIT 10;
```

**Redis caching (analytics-event.handler.ts):**
```ts
// Cache dashboard aggregates in Redis with 5-minute TTL
// Invalidate on relevant Kafka events:
@EventPattern('task.completed')   → invalidate dashboard cache for projectId
@EventPattern('batch.completed')  → invalidate project progress cache
@EventPattern('quality_check.completed') → invalidate quality trend cache

// Cache key schema:
analytics:dashboard:{customerId|projectId}   TTL=300s
analytics:quality:{projectId}                TTL=300s
analytics:productivity:{userId}              TTL=60s
```

### `app.module.ts` config
```ts
// READ REPLICA: In production, point to Postgres read replica
TypeOrmModule.forRootAsync({
  useFactory: (config) => ({
    type: 'postgres',
    host: config.get('ANALYTICS_DB_HOST', config.get('POSTGRES_HOST')),
    // ... same DB schema, different host for read replica
    extra: { max: 10 },  // analytics doesn't need large pool
  })
})
TypeOrmModule.forFeature([Task, Batch, Project, Assignment, Annotation, QualityCheck, StateTransition])
KafkaModule.forRoot({ clientId: 'analytics-service', topics: ['task.completed', 'batch.completed', 'quality_check.completed'] })
RedisModule    // for caching dashboard aggregates
```

### Environment variables
```
ANALYTICS_SERVICE_PORT=3009
ANALYTICS_DB_HOST=postgres-read-replica  # or same as POSTGRES_HOST in dev
ANALYTICS_CACHE_TTL_SECONDS=300
```

---

## B5. Audit Service (Port 3010)

### Responsibility
Centralized audit log reader and compliance reporter. Consumes all Kafka events and writes enriched audit records. Exposes audit log queries and compliance reports. Eventually supports Elasticsearch for full-text audit search.

### Directory structure
```
apps/audit-service/
  src/
    main.ts
    app.module.ts
    audit/
      audit.controller.ts
      audit.service.ts
      dto/
        audit-query.dto.ts
    events/
      audit-event.handler.ts   ← Kafka: ALL events → write AuditLog
    compliance/
      compliance.controller.ts
      compliance.service.ts
```

### `audit-event.handler.ts` — Kafka consumer
```ts
// Subscribes to ALL major topics (wildcard via regex pattern if KafkaJS supports, else enumerate):
topics: [
  'task.created', 'task.assigned', 'task.updated', 'task.completed',
  'task.submitted', 'task.state_changed',
  'batch.created', 'batch.updated', 'batch.completed',
  'annotation.submitted', 'annotation.updated',
  'quality_check.completed',
  'export.completed',
  'user.registered', 'user.logged_in',
  'assignment.created', 'assignment.expired',
]

// For each event: map to AuditLog record
async handleEvent(topic: string, payload: any): Promise<void> {
  const action = this.topicToAction(topic);      // e.g. 'task.created' → AuditAction.CREATE
  const entityType = this.topicToEntityType(topic); // e.g. 'task.created' → 'TASK'
  const entityId = payload.id ?? payload.taskId ?? payload.batchId;

  await this.auditRepo.save(this.auditRepo.create({
    entityType,
    entityId,
    action,
    userId: payload.userId ?? payload.requestedBy ?? null,
    timestamp: new Date(payload.timestamp ?? Date.now()),
    changes: payload.changes ?? null,
    metadata: { topic, kafkaOffset: payload._offset },
  }));
}
```

### `audit.controller.ts` — Endpoints
```
GET /audit-logs
    Query: ?entityType=TASK&entityId=&userId=&action=&dateFrom=&dateTo=&page=&limit=
    Returns: paginated AuditLog[]

GET /audit-logs/entity/:type/:id
    Returns: full audit trail for a specific entity (task/batch/annotation)

GET /audit-logs/user/:userId
    Returns: all actions by a specific user
```

### `compliance.controller.ts` — Endpoints
```
GET /compliance/report
    Query: ?projectId=&dateFrom=&dateTo=
    Returns: {
      totalActions, actionBreakdown{}, userActionSummary[],
      dataAccessEvents[], exportEvents[],
      piiAccessLog[]   (READ actions on user data)
    }

GET /compliance/data-retention
    Returns: tables with retention policy status, oldest record dates,
             recommended archival actions

POST /compliance/gdpr/right-to-erasure
    Body: { userId }
    Anonymizes user data in audit_logs (replace userId with 'ANONYMIZED')
```

### `audit.service.ts` — Methods
```ts
queryAuditLogs(filter: AuditQueryDto): Promise<{ data: AuditLog[]; total: number }>
getEntityAuditTrail(entityType: string, entityId: string): Promise<AuditLog[]>
getUserAuditTrail(userId: string, dateRange: DateRange): Promise<AuditLog[]>
generateComplianceReport(projectId: string, dateRange: DateRange): Promise<ComplianceReport>
anonymizeUser(userId: string): Promise<{ anonymizedCount: number }>
```

### Relationship with `AuditInterceptor` (Part A4)
Both write to `audit_logs`. They are complementary, not duplicate:
- `AuditInterceptor` (in each service) = **synchronous**, captures HTTP-level CRUD in real time
- `audit-service` Kafka consumer = **asynchronous**, captures business-level domain events with richer context (e.g., annotation content, batch metadata)

The `audit-service` is the single **reader and reporter**. Other services only write via the interceptor or Kafka.

### `app.module.ts` config
```ts
TypeOrmModule.forFeature([AuditLog, User])
KafkaModule.forRoot({
  clientId: 'audit-service',
  consumerGroupId: 'audit-group',
  topics: [ /* all topics listed above */ ]
})
// Pool size: low — mostly writes from Kafka + reads from API
extra: { max: 10 }
```

### Environment variables
```
AUDIT_SERVICE_PORT=3010
AUDIT_DB_HOST=...          # Can point to read replica for queries
```

---

# PART C — SHARED CHANGES REQUIRED

## C1. Kafka Topic Registry (add to `libs/common/src/constants/index.ts`)

```ts
export const KAFKA_TOPICS = {
  // Task Management
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',
  TASK_SUBMITTED: 'task.submitted',
  TASK_STATE_CHANGED: 'task.state_changed',

  // Batch / Project
  BATCH_CREATED: 'batch.created',
  BATCH_UPDATED: 'batch.updated',
  BATCH_COMPLETED: 'batch.completed',

  // Annotation
  ANNOTATION_SUBMITTED: 'annotation.submitted',
  ANNOTATION_UPDATED: 'annotation.updated',
  ANNOTATION_DRAFT_SAVED: 'annotation.draft_saved',

  // Quality
  QUALITY_CHECK_COMPLETED: 'quality_check.completed',
  QUALITY_CHECK_FAILED: 'quality_check.failed',

  // Assignment
  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_EXPIRED: 'assignment.expired',

  // Workflow
  STATE_TRANSITIONED: 'state.transitioned',

  // File
  FILE_UPLOADED: 'file.uploaded',
  FILE_DELETED: 'file.deleted',

  // Export
  EXPORT_COMPLETED: 'export.completed',
  EXPORT_FAILED: 'export.failed',

  // Notification (routing)
  NOTIFICATION_SEND: 'notification.send',

  // Auth
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',
} as const;
```

## C2. Kafka Standard Event Envelope (add to `libs/common/src/dto/`)

```ts
// libs/common/src/dto/kafka-event.dto.ts
export interface KafkaEventEnvelope<T = Record<string, any>> {
  eventId: string;            // uuid — for deduplication
  eventType: string;          // e.g. 'task.created'
  timestamp: string;          // ISO 8601
  version: string;            // '1.0' — for schema evolution
  source: string;             // emitting service: 'task-management'
  correlationId?: string;     // trace ID for request chaining
  payload: T;
}
```

All services should wrap their Kafka publishes in this envelope.

## C3. New `libs/common` entities to export

Add to `libs/common/src/entities/index.ts`:
```ts
export * from './annotation-version.entity';  // already created
export * from './quality-rule.entity';         // already created
// GoldTask is already in annotation-qa-service — move to libs/common for cross-service use
```

## C4. `nest-cli.json` additions

```json
{
  "projects": {
    "file-storage-service": {
      "type": "application",
      "root": "apps/file-storage-service",
      "entryFile": "main",
      "sourceRoot": "apps/file-storage-service/src",
      "compilerOptions": { "tsConfigPath": "apps/file-storage-service/tsconfig.app.json" }
    },
    "export-service": { ... },
    "notification-service": { ... },
    "analytics-service": { ... },
    "audit-service": { ... }
  }
}
```

## C5. docker-compose additions

```yaml
file-storage-service:
  build: { context: ., dockerfile: apps/file-storage-service/Dockerfile }
  ports: ["3006:3006"]
  environment:
    STORAGE_TYPE: local
    MEDIA_FILES_PATH: /app/media
  volumes: ["./media:/app/media"]

export-service:
  ports: ["3007:3007"]
  environment:
    EXPORT_QUEUE_REDIS_HOST: redis
    AWS_BUCKET: welo-exports

notification-service:
  ports: ["3008:3008"]
  environment:
    EMAIL_PROVIDER: console    # dev: logs email to console, no actual send

analytics-service:
  ports: ["3009:3009"]
  environment:
    ANALYTICS_DB_HOST: postgres    # same DB in dev

audit-service:
  ports: ["3010:3010"]
```

---

# PART D — IMPLEMENTATION EXECUTION ORDER

## Phase 1 — Drift Fixes (no new services, low risk)

| Step | Change | Risk |
|------|--------|------|
| 1 | Delete task-management `BatchController` | Zero — remove only |
| 2 | Remove `POST /tasks/:id/events` from task-management controller | Low — add to workflow-engine docs |
| 3 | Remove annotation submit from annotation-qa-service; add Kafka consumer | Medium — test QC pipeline |
| 4 | Create `AuditInterceptor` + register in each app | Low — additive only |
| 5 | Create `QueueController` + `QueueService` in project-management | Low — additive only |
| 6 | Add `POST /files/upload` to `MediaController` | Low — additive only |

## Phase 2 — Audit Service (simplest new service)

Uses existing `AuditLog` entity. Only reads/writes one table. Kafka consumer is straightforward.
Delivers immediate compliance value with minimal complexity.

## Phase 3 — Notification Service

Uses existing `Notification` entity. Delivers task assignment emails immediately on launch.
Real-time WebSocket can be deferred to Phase 4 — in-app polling works for MVP.

## Phase 4 — File Storage Service

Required before production file ingestion. Implement local disk mode first (no S3 changes, just adds upload endpoint). S3 swap is a single provider implementation change.

## Phase 5 — Export Service

Requires File Storage (Phase 4) for S3 output. Start with JSON format only, add COCO/CSV formatters incrementally.

## Phase 6 — Analytics Service

Purely read-only. Can be added at any point. Implement dashboard endpoint first; trend analysis endpoints second.

---

# PART E — TESTING STRATEGY PER SERVICE

| Service | Unit Tests | Integration Tests |
|---------|-----------|------------------|
| Drift fixes | Test that `BatchController` is not in task-management routes | Hit port 3004 for all batch ops |
| AuditInterceptor | Mock repo, verify write on POST/PATCH/DELETE | Confirm audit_logs row after API call |
| File Storage | Mock `IStorageProvider`, test metadata creation | Full upload → confirm → fileUrl assertion |
| Export | Mock formatter, test job processor in isolation | Queue job → poll until COMPLETED → download |
| Notification | Mock channels, verify dispatch routing per user prefs | Send Kafka event → verify DB row + WS emit |
| Analytics | Mock repos, test SQL aggregate correctness | Compare computed metrics against known fixture data |
| Audit Service | Mock Kafka consumer, test topicToAction mapping | Consume real Kafka event → verify audit_logs row |
