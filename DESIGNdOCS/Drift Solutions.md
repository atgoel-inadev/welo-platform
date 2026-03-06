# Welo Platform — Drift Solutions

Concrete resolution for each drift identified in [Architecture Gap Analysis.md](./Architecture%20Gap%20Analysis.md).

---

## Drift 1: Duplicate `BatchController` in `task-management`

### Root Cause
`apps/task-management/src/batch/batch.controller.ts` was created as a read/create convenience endpoint. It duplicates list, get, create, and statistics operations that the full `project-management` `BatchService` already owns — but without the business logic (no file allocation, no auto-assign, no pull-next-task, no batch completion).

### Why It's Harmful
- Two services expose `GET /batches` and `POST /batches` but return differently shaped responses
- `getBatchStatistics` is implemented twice with different SQL (one uses GROUP BY aggregation, the other loads tasks into Node.js)
- Callers must know which port to hit for which batch operation

### Solution: Delete the duplicate controller

**Step 1 — Remove `batch.controller.ts` from task-management:**
```
DELETE: apps/task-management/src/batch/batch.controller.ts
```

**Step 2 — Remove `BatchController` from `app.module.ts`:**
```ts
// apps/task-management/src/app.module.ts
// BEFORE
controllers: [TaskController, BatchController],

// AFTER
controllers: [TaskController],
// Remove: import { BatchController } from './batch/batch.controller';
```

**Step 3 — Keep `Batch` repository in `TypeOrmModule.forFeature`** (TaskService needs it to validate batch exists when creating tasks and to update `totalTasks`/`completedTasks` counts). No further changes needed in TaskService.

**Canonical surface after fix:**

| Operation | Owner |
|-----------|-------|
| List / Get / Create / Update batch | `project-management` (port 3004) |
| Allocate files, scan directory | `project-management` (port 3004) |
| Pull next task, auto-assign | `project-management` (port 3004) |
| Batch statistics | `project-management` (port 3004) |
| Task CRUD, submit, assign | `task-management` (port 3003) |

---

## Drift 2: Annotation Saving in Two Services

### Root Cause
Two separate code paths write annotation data:

| Path | Location | What it writes |
|------|----------|----------------|
| `POST /tasks/:id/annotation` (`saveAnnotation`) | task-management `TaskService` | `task.annotationResponses` JSONB (denormalized fast read) |
| `POST /tasks/:id/submit` (`submitTask`) | task-management `TaskService` | `Annotation` + `AnnotationResponse` records (normalized) |
| `POST /tasks/:taskId/annotations` | annotation-qa-service `AnnotationController` | `Annotation` + `AnnotationVersion` records + triggers QC |

### Why It's Harmful
- `submitTask` and the annotation-qa-service endpoint create Annotation records independently. Both can exist for the same task assignment with no coordination.
- `saveAnnotation` writes a JSONB blob on the Task directly — if `submitTask` is also called, they're inconsistent.

### Solution: One submission path; annotation-qa-service reacts via Kafka

**Principle**: Task-management is the submission entry point for the annotator workflow. annotation-qa-service reacts to events and does QC — it does not receive direct annotation submissions from the UI.

**Step 1 — Make `task-management` the single submission endpoint.**

`submitTask` in `task.service.ts` already:
- Creates `Annotation` + `AnnotationResponse` records
- Publishes `annotation.submitted` Kafka event
- Requests quality check via `publishQualityCheckRequest`

This is correct. No change needed here.

**Step 2 — Wire annotation-qa-service to consume the Kafka event instead of accepting HTTP submissions.**

```ts
// apps/annotation-qa-service/src/annotation/annotation.service.ts
// Keep getAnnotations(), getHistory(), compare() — these are read operations
// Remove: submit() — this is now owned by task-management

// Add a Kafka consumer method:
@EventPattern('annotation.submitted')
async handleAnnotationSubmitted(data: { annotation: Annotation; task: Task }) {
  // Trigger automated QC pipeline
  await this.qualityCheckService.runAutomatedChecks(data.annotation, data.task);
}
```

**Step 3 — Remove `POST /tasks/:taskId/annotations` from the annotation-qa-service `AnnotationController`.**

Keep these endpoints (they are pure reads/comparisons):
- `GET /tasks/:taskId/annotations`
- `PATCH /annotations/:annotationId` (reviewer corrections only)
- `GET /annotations/:annotationId/history`
- `POST /tasks/:taskId/annotations/compare`

**Step 4 — Clarify `saveAnnotation` vs `submitTask`:**

`saveAnnotation` (`POST /tasks/:id/annotation`) writes to `task.annotationResponses` JSONB. This is the **in-progress / autosave** path (think: "save draft"). It should not create `Annotation` records.

`submitTask` (`POST /tasks/:id/submit`) is the **final submission** path. It creates `Annotation` records and publishes the event.

Rename `saveAnnotation` to clarify its role and add a `isDraft: true` flag:
```
POST /tasks/:id/annotation  →  autosave to task JSONB only (no Annotation record)
POST /tasks/:id/submit       →  final submit (creates Annotation records, triggers QC)
```

**Canonical annotation flow after fix:**

```
Annotator (UI)
  │
  ├─ POST /tasks/:id/annotation  →  task-management (autosave JSONB, no DB record)
  │
  └─ POST /tasks/:id/submit      →  task-management
                                      ├── Creates Annotation + AnnotationResponse records
                                      ├── Publishes annotation.submitted (Kafka)
                                      └── annotation-qa-service consumes event → runs QC
```

---

## Drift 3: XState Events Sent From Two Services

### Root Cause

`task-management` `TaskController` has `POST /tasks/:id/events` (`sendEvent`) which directly mutates `task.machineState` JSONB in Postgres without going through XState. Meanwhile, `workflow-engine` `EventController` has the same route pattern and processes events through a proper compiled XState machine with guards, actions, and transition logging.

### Why It's Harmful
- The task-management path bypasses guard evaluation, action execution, and StateTransition audit logging
- Two callers sending events to the same task concurrently can create inconsistent state
- The `workflow-engine`'s Redis state cache gets out of sync if task-management mutates Postgres directly

### Solution: Remove `sendEvent` from task-management; delegate to workflow-engine

**Step 1 — Remove `POST /tasks/:id/events` from `TaskController`:**
```ts
// apps/task-management/src/task/task.controller.ts
// DELETE this entire handler:
@Post(':id/events')
async sendEvent(@Param('id') id: string, @Body() dto: TaskTransitionDto) { ... }
```

**Step 2 — Remove `sendEvent` from `TaskService`** (or keep as private internal only — see note below).

**Step 3 — Internal state updates in task-management (submitTask, assignTask, etc.) should publish Kafka events and let workflow-engine react:**

Currently `submitTask` directly writes `task.machineState`. The correct pattern:
```ts
// After saving the Annotation record:
await this.kafkaService.publishEvent('annotation.submitted', { taskId, annotationId, userId });
// workflow-engine consumes this → sends ANNOTATION_SUBMITTED event to XState machine
// → machine transitions state → persists new machineState snapshot via its own repo write
```

This is a deeper change. For now, a pragmatic middle ground:

**Pragmatic fix (lower risk):** Keep internal `machineState` updates in task-management for status transitions (they are synchronous and need to complete within the same request). But remove the **public HTTP endpoint** `POST /tasks/:id/events` so external callers cannot bypass workflow-engine.

```ts
// TaskController: DELETE the /events endpoint
// TaskService.sendEvent(): KEEP but make it private/internal
// All external XState event sending MUST go through workflow-engine port 3001
```

**Document the rule in code:**
```ts
// task.service.ts — add this comment to sendEvent:
/**
 * INTERNAL USE ONLY — direct machineState mutation for simple status sync.
 * External callers must use Workflow Engine Service POST /tasks/:id/events.
 * @deprecated Use Kafka events + workflow-engine for new state transitions.
 */
private async sendEvent(taskId: string, dto: TaskTransitionDto): Promise<Task> { ... }
```

---

## Drift 4: `AuditLog` Entity is Orphaned (Nothing Writes to It)

### Root Cause
`AuditLog` entity is defined and registered in all modules, but no service ever injects its repository and writes to it.

### Solution: Lightweight NestJS Interceptor

Instead of adding `AuditLogRepository` injection to every service, implement a single `AuditInterceptor` that intercepts write operations and logs them automatically.

**Step 1 — Create `libs/common/src/interceptors/audit.interceptor.ts`:**
```ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only audit mutating operations
    if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
      return next.handle();
    }

    const action = this.mapMethodToAction(method);
    const userId = req.user?.userId || req.headers['x-user-id'];

    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.auditRepo.save(this.auditRepo.create({
            entityType: this.extractEntityType(req.path),
            entityId: response?.id || req.params?.id,
            action,
            userId,
            timestamp: new Date(),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          }));
        } catch (_) {
          // Never fail the request because of audit logging
        }
      }),
    );
  }

  private mapMethodToAction(method: string): AuditAction {
    const map = { POST: 'CREATE', PATCH: 'UPDATE', PUT: 'UPDATE', DELETE: 'DELETE' };
    return map[method] as AuditAction;
  }

  private extractEntityType(path: string): string {
    // e.g. /tasks/123 → TASK, /batches/456 → BATCH
    const segment = path.split('/').filter(Boolean)[0]?.toUpperCase().replace(/S$/, '');
    return segment || 'UNKNOWN';
  }
}
```

**Step 2 — Register as a global interceptor in each app module:**
```ts
// In each app.module.ts providers array:
{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }
```

This gives audit coverage across all services without touching individual service code.

---

## Drift 5: `Queue` Entity is Orphaned

### Root Cause
`Queue` entity exists in the data model and is registered in all module `forFeature()` arrays, but no `QueueController` or `QueueService` exists. The Redis-based `TaskQueueService` has replaced the DB queue concept for the hot path.

### Two valid options:

**Option A — Implement Queue as configuration (recommended)**

The `Queue` entity in the DB is not a runtime queue — it's queue *configuration* (assignment rules, capacity limits, skill requirements). The Redis sorted set is the runtime queue.

Create a minimal `QueueController` in `project-management`:
```ts
@Controller('queues')
export class QueueController {
  // GET  /queues?projectId=   — list configured queues
  // POST /queues              — create queue config
  // PATCH /queues/:id         — update rules
  // GET  /queues/:id/size     — call TaskQueueService.size() from Redis
  // POST /queues/:id/pause    — set status = PAUSED (stops auto-assignment)
}
```

**Option B — Remove the entity (lower priority)**

If Queue configuration is already embedded in `Project.configuration.workflowConfiguration.assignmentRules`, then the `Queue` table is redundant. Remove it from `forFeature()` arrays and mark it deprecated in the data model until a clear use case arises.

**Recommendation**: Option A — implement it in project-management as a queue configuration surface. This keeps the design intent intact and gives PMs a way to configure assignment rules per queue per project type.

---

## Drift 6: `MediaController` is Not Production-Ready

### Root Cause
`MediaController` in `project-management` serves files from `/app/media` on local disk. It has no upload capability and no S3 integration.

### Solution: Phased approach

**Phase 1 (immediate) — Add upload endpoint to project-management MediaController:**

```ts
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @UploadedFile() file: Express.Multer.File,
  @Query('projectId') projectId: string,
  @Query('batchName') batchName: string,
): Promise<{ fileUrl: string; fileName: string; fileSize: number }> {
  // For now: save to local disk at /app/media/{projectId}/{batchName}/{uuid}-{filename}
  // Returns the URL path clients can use in allocateFiles
  // Later: replace body with S3 putObject call
}
```

This unblocks the UI from having to pre-upload files out-of-band.

**Phase 2 (production) — Extract to File Storage Service or swap to S3:**

Replace the disk write with:
```ts
const s3Key = `${projectId}/${batchName}/${uuid()}-${file.originalname}`;
await this.s3.putObject({ Bucket: process.env.S3_BUCKET, Key: s3Key, Body: file.buffer });
const fileUrl = `${process.env.CDN_BASE_URL}/${s3Key}`;
// OR: generate presigned URL and return it, let client upload directly
```

The `allocateFiles` endpoint in `BatchService` doesn't need to change — it already accepts `fileUrl` as a string.

---

## Summary: Change Map

| Drift | File(s) to Change | Change Type |
|-------|------------------|-------------|
| Duplicate BatchController | `apps/task-management/src/batch/batch.controller.ts` | **DELETE** |
| Duplicate BatchController | `apps/task-management/src/app.module.ts` | Remove `BatchController` from controllers array |
| Annotation duplication | `apps/annotation-qa-service/src/annotation/annotation.controller.ts` | Remove `POST submit` endpoint |
| Annotation duplication | `apps/annotation-qa-service/src/annotation/annotation.service.ts` | Add `@EventPattern('annotation.submitted')` Kafka consumer |
| XState event duplication | `apps/task-management/src/task/task.controller.ts` | Remove `POST /tasks/:id/events` handler |
| XState event duplication | `apps/task-management/src/task/task.service.ts` | Make `sendEvent` private / add deprecation comment |
| AuditLog orphaned | `libs/common/src/interceptors/audit.interceptor.ts` | **CREATE** new interceptor |
| AuditLog orphaned | Each `app.module.ts` | Register `APP_INTERCEPTOR` |
| Queue orphaned | `apps/project-management/src/controllers/queue.controller.ts` | **CREATE** (Option A) |
| Media not production-ready | `apps/project-management/src/controllers/media.controller.ts` | Add `POST /upload` endpoint |

---

## Execution Order

Start with the no-risk removals, then the additive work:

1. **Delete** `task-management` BatchController — zero risk, removes confusion immediately
2. **Remove** `POST /tasks/:id/events` from task-management TaskController — callers redirect to workflow-engine
3. **Remove** annotation submit from annotation-qa-service, add Kafka consumer
4. **Add** `POST /media/upload` to project-management MediaController
5. **Create** `AuditInterceptor` — purely additive, no existing code changes
6. **Create** `QueueController` in project-management (Option A)
