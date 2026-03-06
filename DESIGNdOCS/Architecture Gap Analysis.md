# Welo Platform — Architecture Gap & Drift Analysis

**Compared**: `Microservices Architecture.md` + `Data Model.md` vs. actual implementation in `apps/`

---

## 1. Service Inventory: Design vs. Reality

The architecture design specifies **12 microservices**. The current implementation has **5 NestJS apps**.

| # | Designed Service | Designed Port | Actual Status | Actual Location |
|---|-----------------|--------------|--------------|----------------|
| 1 | Auth & Authorization | — | **Implemented** (core only) | `apps/auth-service` (port 3002) |
| 2 | Project Management | — | **Implemented** | `apps/project-management` (port 3004) |
| 3 | Task Management | — | **Implemented** | `apps/task-management` (port 3003) |
| 4 | Workflow Engine | — | **Implemented** | `apps/workflow-engine` (port 3001) |
| 5 | Annotation Service | — | **Merged** into annotation-qa-service | `apps/annotation-qa-service` (port 3005) |
| 6 | Quality Assurance Service | — | **Merged** into annotation-qa-service | `apps/annotation-qa-service` (port 3005) |
| 7 | Export Service | — | **NOT IMPLEMENTED** | Entity exists, no app |
| 8 | Notification Service | — | **NOT IMPLEMENTED** | Entity exists, no app |
| 9 | Analytics & Reporting | — | **NOT IMPLEMENTED** | No entity, no app |
| 10 | Audit Service | — | **NOT IMPLEMENTED** | Entity exists, no app |
| 11 | File Storage Service | — | **NOT IMPLEMENTED** (file serving only) | Partial in `project-management` |
| 12 | Comment & Collaboration | — | **Absorbed** into task-management | `CommentService` in task-management |

---

## 2. Drift: Functionality in the Wrong Service

These are cases where functionality was built, but landed in a different service than designed.

### 2.1 Batch Management — Split Across Two Services (Critical Drift)

**Design intent**: Batch management belongs to Task Management Service (owns Task, Batch, Queue, Assignment entities).

**Actual reality**: Batch controllers exist in **both** services with overlapping but different capabilities:

| Capability | `project-management` BatchController | `task-management` BatchController |
|-----------|--------------------------------------|----------------------------------|
| List/Get/Create batch | Yes (full service layer) | Yes (direct repository access) |
| Update batch | Yes | No |
| Batch statistics | Yes (optimized GROUP BY queries) | Yes (separate implementation) |
| Allocate files → create tasks | **Yes** (`/allocate-files`, `/allocate-folder`) | No |
| Scan directory → create tasks | **Yes** (`/scan-directory`) | No |
| Pull next task | **Yes** (`/pull-next-task`) | No |
| Assign task | **Yes** (`/assign-task`) | No |
| Auto-assign tasks in batch | **Yes** (`/auto-assign`) | No |
| Complete batch | **Yes** | No |

**Problem**: Two `BatchController` classes on the same entity. The `task-management` batch controller is a thin read/create layer that bypasses the full `BatchService`. This creates:
- Duplicate logic (statistics calculated two different ways)
- Confusion about which port to call for which operation
- Project-management is doing task assignment, which is a task-management concern

**Resolution**: See Section 5 — the `task-management` BatchController should be removed; project-management's should be the canonical batch management surface, with task creation staying there.

---

### 2.2 Annotation Saving — Duplicated Across Two Services

**Design intent**: Annotation submission → Annotation Service. Task lifecycle → Task Management.

**Actual reality**:
- `task-management` `TaskController` has `POST /tasks/:id/annotation` (`saveAnnotation`) and `POST /tasks/:id/review` (`saveReview`) that write annotation data directly to the task's `annotationResponses` JSONB field
- `annotation-qa-service` `AnnotationController` has `POST /tasks/:taskId/annotations` that creates proper `Annotation` and `AnnotationResponse` records

These are two separate code paths for submitting annotation data. The task-management path denormalizes into the task record directly; the annotation-qa path creates normalized relational records. Both are valid patterns but they are **not coordinated**.

---

### 2.3 Workflow Event Processing — Duplicated

**Design intent**: All XState events go through Workflow Engine Service.

**Actual reality**:
- `workflow-engine` has `POST /tasks/:taskId/events` and `GET /tasks/:taskId/state` (correct)
- `task-management` `TaskController` **also** has `POST /tasks/:id/events` (`sendEvent`) and manages `machineState` on the Task entity directly

Two services can send events to the same task's state machine. Race conditions are possible.

---

### 2.4 Comment Service — Absorbed Into Task Management

**Design intent**: Separate Comment & Collaboration Service with threaded discussions, real-time updates, Elasticsearch search.

**Actual reality**: `CommentService` lives inside `apps/task-management`, exposed via `TaskController` at `/tasks/:id/comments`. Only basic CRUD is implemented (no threading model beyond `parentCommentId`, no real-time, no search).

This is a pragmatic consolidation that is acceptable for now but loses the real-time and search capabilities from the design.

---

### 2.5 User Management — Absorbed Into Auth Service

**Design intent**: Auth service owns authentication only (login, tokens, sessions). User profile management is implicit.

**Actual reality**: `AuthController` has full user CRUD (`GET/POST/PATCH/DELETE /auth/users`). This is reasonable — the auth service is the right owner of the User entity. No major concern here, just note the scope expanded.

---

### 2.6 Media/File Serving — Misplaced in Project Management

**Design intent**: File Storage Service handles both upload AND retrieval with S3/CDN backing.

**Actual reality**: `MediaController` in `project-management` serves files from **local disk** (`/app/media/{projectId}/{batchName}/{filename}`). It is read-only — no upload endpoint, no S3/MinIO integration, no presigned URLs.

This is a **dev/demo convenience** that has no path to production S3 unless actively replaced.

---

## 3. Implementation Gaps: Designed but Not Built

### 3.1 File Storage Service (MISSING — High Priority)

The entire File Storage Service is absent:

| Designed Capability | Status |
|--------------------|--------|
| `POST /files/upload` (multipart) | **Missing** |
| `POST /files/presigned-url` (S3 presigned upload) | **Missing** |
| `GET /files/{id}/download` | **Missing** |
| `DELETE /files/{id}` | **Missing** |
| Virus scanning | **Missing** |
| Image/video thumbnails | **Missing** |
| CDN integration | **Missing** |
| File lifecycle / quota management | **Missing** |
| `file.uploaded` Kafka event | **Missing** |
| File metadata database table | **Missing** (no `files` entity exists) |

What exists instead: `MediaController` serves local files for the dev/demo environment. The `Task` entity has `fileUrl`, `fileType`, `fileMetadata` fields that store file references, but there is no managed File entity backing those references.

---

### 3.2 Export Service (MISSING)

The `Export` entity exists in the data model and is registered in all modules, but there is no:
- Export controller or service
- Background job / worker for async export generation
- S3 file output
- Format converters (COCO, PASCAL_VOC, JSONL, CSV)

The `Export` table will be empty in all environments.

---

### 3.3 Notification Service (MISSING)

The `Notification` entity exists but there is no:
- Notification delivery mechanism
- Email/SMS integration
- WebSocket real-time delivery
- Notification preferences
- Webhook management

Notifications are created by services (via Kafka `notification.send` topic) but nothing consumes that event.

---

### 3.4 Analytics & Reporting Service (MISSING)

No entity, no service, no controller exists. The only analytics present are:
- `GET /tasks/analytics/time` in task-management (basic time tracking query)
- `GET /batches/:id/statistics` in both batch controllers
- `GET /quality-checks/project/:id/metrics` in annotation-qa-service

No dashboard aggregation, no historical trend data, no ClickHouse/TimescaleDB integration.

---

### 3.5 Audit Service (MISSING)

The `AuditLog` entity exists but:
- No audit service reads or exposes it
- Nothing writes to `audit_logs` (no `AuditLog` repository injection found in any service)
- No compliance reporting
- No Elasticsearch integration

---

### 3.6 API Gateway (MISSING)

No API Gateway (Kong/Nginx/Traefik) is configured. All 5 services are directly exposed on separate ports. There is no:
- Unified entry point
- Cross-service rate limiting
- JWT pre-validation at gateway level
- Request routing
- CORS centralization

---

### 3.7 Queue Entity — Orphaned

The `Queue` entity is defined in the data model and registered in modules, but:
- No `QueueController` or `QueueService` exists in any app
- The Redis-based `TaskQueueService` (sorted sets) now serves the queue function
- The `Queue` table has no reads or writes

The designed `GET/POST/PATCH /queues` endpoints do not exist.

---

### 3.8 Auth: OAuth2/OIDC, MFA, Sessions

The designed auth capabilities not yet implemented:
- OAuth2/OIDC integration (currently: JWT with mock-users.json in dev)
- Multi-factor authentication
- Redis session management (auth service does not use Redis currently)
- `GET /auth/permissions` endpoint
- `POST /auth/verify-token` endpoint (for service-to-service token validation)

---

### 3.9 Workflow Engine: Simulation and Visualization

Designed but not confirmed implemented:
- `POST /workflows/:id/simulate` — endpoint exists in controller but simulation logic depth is unknown
- `GET /workflows/:id/visualization` — endpoint exists but no layout engine
- Workflow hot-reloading
- Actor registry in Redis (designed but `AssignmentLockService`/`TaskQueueService` don't include actor registry pattern)

---

## 4. Data Model Gaps

Entities defined in `Data Model.md` but **no TypeORM entity file exists**:

| Entity | Defined In Doc | Entity File | Notes |
|--------|---------------|-------------|-------|
| `AnnotationVersion` | Yes (section 8) | **No** | Versioning on update not persisted |
| `QualityRule` | Yes (section 11) | **No** | Automated rule engine has no config table |
| `GoldTask` | Yes (section 12) | **Yes** (annotation-qa-service) | Exists but only in annotation-qa-service scope |

The `GoldTask` entity is defined in `annotation-qa-service` but not in `libs/common/src/entities`, meaning it cannot be used by other services.

---

## 5. File Upload + S3 Mapping → Task Creation: Where Should It Live?

This is the most important architectural decision to resolve.

### Current State

```
[Client] --(file URLs in body)--> POST /batches/:id/allocate-files
                                   └── project-management BatchService
                                        └── Creates Task records with fileUrl, fileType, fileMetadata
```

Files are never actually uploaded through the platform. The client is expected to provide pre-existing URLs.

### The Design Intent

```
[Client] --> POST /files/upload --> File Storage Service
                                     ├── Stores in S3/MinIO
                                     ├── Creates File record (metadata)
                                     └── Publishes file.uploaded event
                                              │
                                              ▼
                                    Task Management consumes event
                                     └── Creates Task record with fileId reference
```

### Recommended Architecture

**File upload and S3 management = File Storage Service** (separate microservice or extracted module)
**File-to-task mapping (batch allocation) = Project Management Service**

Here is the reasoning:

**Why file upload should NOT be in project-management or task-management:**
- File storage is infrastructure-level (virus scan, CDN, quota) — independent of business domain
- File URLs need to work across services (annotation service needs to display them, export service needs to reference them)
- S3 credentials and storage policy should be centralized, not embedded in a business service

**Why file-to-task mapping belongs in project-management (not task-management):**
- A `Batch` is a project management concept: it groups a set of files for annotation under a project's configuration
- The decision "which files go into which batch" is made by a Project Manager, not by the task assignment system
- `BatchService.allocateFiles()` already correctly lives in project-management — it reads the batch's project config, infers the workflow, and creates tasks accordingly
- Task-management's role starts *after* tasks exist: assignment, claiming, submission, state transitions

**Conclusion — the correct flow:**

```
[Client/PM UI]
    │
    ├─1─► POST /files/presigned-url     → File Storage Service (new)
    │         Returns: { uploadUrl, fileId, fileKey }
    │
    ├─2─► PUT {uploadUrl}               → Direct S3 upload (client-side)
    │
    ├─3─► POST /files/{fileId}/confirm  → File Storage Service
    │         Publishes: file.uploaded { fileId, fileUrl, fileKey, metadata }
    │         Returns: { fileId, fileUrl }
    │
    └─4─► POST /batches/:id/allocate-files  → Project Management
              Body: [{ fileId, externalId, fileType }]
              BatchService fetches fileUrl from File Storage Service (sync call)
              Creates Task records with fileUrl + fileMetadata
              Publishes: task.created (×N) to Kafka
                              │
                              ▼
              Task Management (already running)
              Workflow Engine initializes state machines
```

**For the current dev/demo setup (no S3):**

The existing `MediaController` + `scan-directory` flow is acceptable as a local dev shortcut. To productionize:
1. Build `File Storage Service` (can start as a module inside project-management and extract later)
2. Replace `MediaController` disk serving with presigned S3 URL generation
3. `allocateFiles` continues to live in project-management `BatchService` — it just references File Service instead of raw URLs

---

## 6. Summary Table

### Overlap / Redundancy (Things built in the wrong place)

| Issue | Location | Impact |
|-------|----------|--------|
| Duplicate BatchController | project-management AND task-management | Confusion, dual code paths |
| Duplicate annotation saving | task-management (JSONB denorm) AND annotation-qa-service (normalized) | Inconsistent data |
| Duplicate XState event sending | task-management `sendEvent` AND workflow-engine | Race conditions possible |
| Comment service embedded in task-management | task-management | No real-time, no search |
| File serving in project-management (local disk) | project-management | Not production-ready |
| Queue entity orphaned | All modules (unused) | Dead table in schema |
| AuditLog entity orphaned | All modules (nothing writes to it) | Compliance gap |

### Gaps (Designed but not built)

| Missing Service/Feature | Priority | Notes |
|------------------------|----------|-------|
| File Storage Service (upload + S3) | **High** | Blocks production file ingestion |
| Export Service | **High** | Core platform output capability |
| API Gateway | **High** | Required before any production deployment |
| Notification Service | **Medium** | Email/webhook delivery |
| Analytics & Reporting Service | **Medium** | Dashboard data |
| Audit Service | **Medium** | Compliance requirement |
| `AnnotationVersion` entity | **Medium** | Annotation history versioning |
| `QualityRule` entity | **Low** | Automated QC rule config |
| Auth: OAuth2/OIDC, MFA, Redis sessions | **Medium** | Required for production auth |
| Queue entity implementation or removal | **Low** | Either build it or drop the entity |
| `POST /auth/verify-token` endpoint | **Medium** | Service-to-service auth |
