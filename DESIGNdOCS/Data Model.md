# Welo Data Annotation Platform - Data Model

## Overview
This document defines the core data entities for the Welo Data Annotation Platform, reflecting the actual TypeORM entity implementations across the microservices architecture. The platform is built as a NestJS monorepo with shared entities defined in `libs/common/src/entities/`.

---

## Architecture

The platform is a microservices monorepo with 5 services sharing a common PostgreSQL database schema:

| Service | Port | Responsibilities |
|---------|------|-----------------|
| Workflow Engine | 3001 | XState workflow definitions, instances, events, state transitions |
| Auth Service | 3002 | Authentication, user management (mock JSON store in dev) |
| Task Management | 3003 | Tasks, assignments, stage-based workflow, plugin execution, comments |
| Project Management | 3004 | Projects, batches, customers, UI configurations, plugins, secrets, media |
| Annotation QA Service | 3005 | Annotations, reviews, quality checks, gold tasks |

All shared entities extend `BaseEntity` which provides:
```
BaseEntity {
  id: UUID (PK, auto-generated)
  createdAt: Timestamp (auto-set)
  updatedAt: Timestamp (auto-updated)
  metadata: JSON (optional)
}
```

---

## Core Entities

### 1. Project
Represents a customer annotation project with full configuration including annotation questions, workflow rules, plugins, and UI settings.

**Table:** `projects`

```
Project extends BaseEntity {
  name: String (255)
  customerId: UUID (FK -> Customer)
  description: Text
  projectType: Enum [TEXT, IMAGE, VIDEO, AUDIO, MULTIMODAL]
  status: Enum [DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED]
  defaultWorkflowId: UUID (FK -> Workflow, nullable)
  configuration: JSONB {
    annotationSchema: Object
    qualityThresholds: Object
    workflowRules: Object
    uiConfiguration: Object
    xstateServices?: Object
    xstateGuards?: Object
    xstateActions?: Object
    annotationQuestions?: Array<{
      id: String
      question: String
      questionType: Enum [MULTI_SELECT, TEXT, SINGLE_SELECT, NUMBER, DATE]
      required: Boolean
      options?: Array<{ id: String, label: String, value: String }>
      validation?: { minLength?, maxLength?, pattern?, min?, max? }
      dependsOn?: String   // question ID
      showWhen?: Object    // conditional display rules
    }>
    workflowConfiguration?: {
      annotatorsPerTask: Integer
      reviewLevels: Array<{
        level: Integer
        name: String
        reviewersCount: Integer
        requireAllApprovals: Boolean
        approvalThreshold?: Number
        autoAssign: Boolean
        allowedReviewers?: String[]
      }>
      approvalCriteria: {
        requireAllAnnotatorConsensus: Boolean
        consensusThreshold?: Number
        qualityScoreMinimum?: Number
        autoApproveIfQualityAbove?: Number
      }
      assignmentRules: {
        allowSelfAssignment: Boolean
        preventDuplicateAssignments: Boolean
        maxConcurrentAssignments?: Integer
        assignmentTimeout?: Integer  // minutes
      }
    }
    supportedFileTypes?: Array<'CSV'|'TXT'|'IMAGE'|'VIDEO'|'AUDIO'|'PDF'>
    plugins?: Array<{
      id: String
      name: String
      description?: String
      type: Enum [API, SCRIPT]
      enabled: Boolean
      trigger: Enum [ON_BLUR, ON_SUBMIT]
      onFailBehavior: Enum [HARD_BLOCK, SOFT_WARN, ADVISORY]
      questionBindings: String[]
      isDraft: Boolean
      version: Integer
      createdAt: String
      updatedAt: String
      deployedAt?: String
      apiConfig?: {
        url: String
        method: Enum [GET, POST, PUT, PATCH]
        headers: Object
        payload?: String
        responseMapping: { resultPath: String, messagePath?: String }
        timeout: Integer
        retries: Integer
      }
      scriptCode?: String
    }>
  }
  createdBy: UUID (FK -> User)
  startDate: Date (nullable)
  endDate: Date (nullable)
}
```

**Indexes:** `customerId`, `status`, `createdAt`

```
Project {
  id: UUID (PK)
  name: String
  customer_id: UUID (FK -> Customer)
  description: Text
  project_type: Enum [TEXT, IMAGE, VIDEO, AUDIO, MULTIMODAL]
  status: Enum [DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED]
  default_workflow_id: UUID (FK -> Workflow)
  configuration: JSON {
    annotation_schema: Object
    quality_thresholds: Object
    workflow_rules: Object
    ui_configuration: Object
    xstate_services: Object (custom service implementations)
    xstate_guards: Object (custom guard implementations)
    xstate_actions: Object (custom action implementations)
  }
  created_at: Timestamp
  updated_at: Timestamp
  created_by: UUID (FK -> User)
  start_date: Date
  end_date: Date
  metadata: JSON
}
```

### 2. Customer
Represents clients using the annotation platform.

**Table:** `customers`

```
Customer extends BaseEntity {
  name: String (255)
  email: String (unique)
  subscription: String (nullable)   // free, pro, enterprise
  status: Enum [ACTIVE, INACTIVE, SUSPENDED]
}
```

### 3. Batch
Represents a collection of tasks grouped for processing and export.

**Table:** `batches`

```
Batch extends BaseEntity {
  projectId: UUID (FK -> Project)
  name: String (255)
  description: Text (nullable)
  status: Enum [CREATED, IN_PROGRESS, REVIEW, COMPLETED, EXPORTED]
  priority: Integer (default: 5, range: 1-10)
  totalTasks: Integer (default: 0)
  completedTasks: Integer (default: 0)
  qualityScore: Decimal (5,2, nullable)
  configuration: JSONB (nullable) {
    assignmentRules: Object
    validationRules: Object
    exportSettings: Object
  }
  dueDate: Timestamp (nullable)
  completedAt: Timestamp (nullable)
}
```

**Indexes:** `projectId`, `status`, `priority`, `dueDate`

### 4. Task
Individual annotation unit within a batch. Stores the full XState machine state and multi-level review/consensus tracking.

**Table:** `tasks`

```
Task extends BaseEntity {
  batchId: UUID (FK -> Batch)
  projectId: UUID (FK -> Project)
  workflowId: UUID (FK -> Workflow)
  externalId: String (255)
  taskType: Enum [ANNOTATION, REVIEW, VALIDATION, CONSENSUS]
  status: Enum [QUEUED, ASSIGNED, IN_PROGRESS, IN_REVIEW, SUBMITTED, APPROVED, REJECTED, SKIPPED]
  priority: Integer (default: 5, range: 1-10)

  # XState Machine State
  machineState: JSONB {
    value: String | Object          // current state (nested/parallel supported)
    context: Object
    history?: Object
    done: Boolean
    changed: Boolean
    tags?: String[]
  }
  previousState: JSONB (nullable)
  stateUpdatedAt: Timestamp (nullable)

  # Task Data
  dataPayload: JSONB {
    sourceData: Object
    references: Array
    context: Object
  }

  # File Information
  fileType: String (50, nullable)   // CSV, TXT, IMAGE, VIDEO, AUDIO, PDF
  fileUrl: Text (nullable)
  fileMetadata: JSONB (nullable) {
    fileName?: String
    fileSize?: Integer
    mimeType?: String
    dimensions?: { width: Integer, height: Integer }
    duration?: Number               // for video/audio
  }

  # Assignment Tracking
  assignmentId: UUID (nullable)     // current active assignment
  attemptCount: Integer (default: 0)
  assignedAt: Timestamp (nullable)
  startedAt: Timestamp (nullable)
  submittedAt: Timestamp (nullable)
  dueDate: Timestamp (nullable)
  estimatedDuration: Integer (seconds, nullable)
  actualDuration: Integer (seconds, nullable)

  # Consensus Tracking
  requiresConsensus: Boolean (default: false)
  consensusReached: Boolean (default: false)
  consensusScore: Decimal (5,2, nullable)           // 0-100
  totalAssignmentsRequired: Integer (default: 1)
  completedAssignments: Integer (default: 0)

  # Multi-Level Review Tracking
  currentReviewLevel: Integer (default: 0)    // 0=annotation, 1+=review levels
  maxReviewLevel: Integer (default: 0)
  allReviewsApproved: Boolean (default: false)

  # Denormalized Annotation Data (for fast access)
  annotationResponses: JSONB (nullable) Array<{
    questionId: String
    response: any
    timestamp: String
    annotatorId: String
  }>
  extraWidgetData: JSONB (nullable)

  # Denormalized Review Data
  reviewData: JSONB (nullable) Array<{
    reviewLevel: Integer
    reviewerId: String
    decision: Enum [APPROVED, REJECTED, NEEDS_REVISION]
    qualityScore?: Number
    comments?: String
    extraWidgetData?: Object
    timestamp: String
  }>
}
```

**Indexes:** `batchId`, `projectId`, `workflowId`, `status`, `priority`, `assignedAt`, `dueDate`, `stateUpdatedAt`
**Composite Indexes:** `(projectId, status, priority)`

### 5. Assignment
Links tasks to users with workflow stage and expiry tracking.

**Table:** `assignments`

```
Assignment extends BaseEntity {
  taskId: UUID (FK -> Task)
  userId: UUID (FK -> User)
  workflowStage: Enum [ANNOTATION, REVIEW, VALIDATION, CONSENSUS]
  status: Enum [ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, EXPIRED, REASSIGNED]
  assignedAt: Timestamp
  acceptedAt: Timestamp (nullable)
  completedAt: Timestamp (nullable)
  expiresAt: Timestamp (nullable)
  assignmentMethod: Enum [AUTOMATIC, MANUAL, CLAIMED]

  # Stage-Based Workflow Fields
  stageId: String (nullable)        // workflow stage identifier
  reworkCount: Integer (default: 0)
  maxRework: Integer (nullable)
}
```

**Indexes:** `taskId`, `userId`, `status`, `assignedAt`
**Composite Indexes:** `(userId, status, assignedAt)`

### 6. Annotation
Stores actual annotation data produced by annotators, with versioning.

**Table:** `annotations`

```
Annotation extends BaseEntity {
  taskId: UUID (FK -> Task)
  assignmentId: UUID (FK -> Assignment)
  userId: UUID (FK -> User)
  annotationData: JSONB {
    labels?: Array
    spans?: Array
    entities?: Array
    relationships?: Array
    attributes?: Object
    freeText?: String
  }
  version: Integer (default: 1)
  isFinal: Boolean (default: false)
  confidenceScore: Decimal (3,2, nullable)   // 0-1
  timeSpent: Integer (seconds, nullable)
  toolVersion: String (50, nullable)
  submittedAt: Timestamp (nullable)
}
```

**Indexes:** `taskId`, `userId`, `submittedAt`, `isFinal`
**Composite Indexes:** `(taskId, version)`

---

### 7. AnnotationResponse
Stores per-question responses for structured annotation forms.

**Table:** `annotation_responses`

```
AnnotationResponse extends BaseEntity {
  taskId: UUID (FK -> Task)
  annotationId: UUID (FK -> Annotation)
  assignmentId: UUID (FK -> Assignment)
  questionId: String (255)
  questionText: Text
  questionType: String (50)   // MULTI_SELECT, TEXT, SINGLE_SELECT, NUMBER, DATE
  response: JSONB {
    value: any
    selectedOptions?: Array<{ id: String, label: String, value: String }>
    textValue?: String
    numberValue?: Number
    dateValue?: String
  }
  timeSpent: Integer (seconds, nullable)
  confidenceScore: Decimal (5,2, nullable)   // 0-100
  isSkipped: Boolean (default: false)
  skipReason: Text (nullable)
}
```

**Indexes:** `taskId`, `annotationId`, `assignmentId`, `questionId`

---

### 8. AnnotationVersion
Stores historical snapshots of annotations when they are updated.

**Table:** `annotation_versions`

```
AnnotationVersion extends BaseEntity {
  annotationId: UUID (FK -> Annotation)
  taskId: UUID (FK -> Task)
  userId: UUID (FK -> User)
  version: Integer
  annotationData: JSONB
  changeReason: String (nullable)
}
```

---

### 9. ReviewApproval
Records multi-level review decisions for tasks (L1 through L5).

**Table:** `review_approvals`

```
ReviewApproval extends BaseEntity {
  taskId: UUID (FK -> Task)
  assignmentId: UUID (FK -> Assignment)
  reviewerId: UUID (FK -> User)
  reviewLevel: Integer (1-5)
  status: Enum [PENDING, APPROVED, REJECTED, CHANGES_REQUESTED]
  comments: Text (nullable)
  feedback: JSONB (nullable) {
    issues?: Array<{
      questionId: String
      issue: String
      severity: Enum [LOW, MEDIUM, HIGH]
    }>
    suggestions?: String[]
    qualityScore?: Number
  }
  reviewedAt: Timestamp (nullable)
  timeSpent: Integer (seconds, nullable)
  requestedChanges: JSONB (nullable) Array<{
    field: String
    currentValue: any
    suggestedValue?: any
    reason: String
  }>
}
```

**Indexes:** `taskId`, `reviewerId`, `assignmentId`, `reviewLevel`, `status`
**Composite Indexes:** `(taskId, reviewLevel, status)`

### 10. QualityCheck
Records automated and manual quality assessments.

**Table:** `quality_checks`

```
QualityCheck extends BaseEntity {
  taskId: UUID (FK -> Task)
  annotationId: UUID (FK -> Annotation)
  reviewerId: UUID (FK -> User, nullable)
  checkType: Enum [AUTOMATED, MANUAL, CONSENSUS, GOLD_STANDARD]
  status: Enum [PASS, FAIL, NEEDS_REVISION, DISPUTED]
  qualityScore: Decimal (5,2)   // 0-100
  issues: JSONB Array<{
    category: String
    severity: Enum [LOW, MEDIUM, HIGH, CRITICAL]
    description: String
    location?: Object
  }>
  feedback: Text (nullable)
  correctedAnnotationId: UUID (FK -> Annotation, nullable)
  resolvedAt: Timestamp (nullable)
}
```

**Indexes:** `taskId`, `annotationId`, `reviewerId`, `checkType`, `status`

---

### 11. QualityRule
Defines automated quality validation rules per project.

**Table:** `quality_rules`

```
QualityRule extends BaseEntity {
  projectId: UUID (FK -> Project)
  name: String
  description: Text (nullable)
  ruleType: String
  conditions: JSONB
  threshold: Number (nullable)
  severity: Enum [LOW, MEDIUM, HIGH, CRITICAL]
  isActive: Boolean (default: true)
}
```

---

### 12. GoldTask
Gold standard annotations used as benchmarks for automated quality comparison.

**Table:** `gold_tasks`

```
GoldTask extends BaseEntity {
  taskId: UUID (FK -> Task, unique)
  projectId: UUID (FK -> Project)
  goldAnnotation: JSONB {
    labels?: Array
    spans?: Array
    entities?: Array
    relationships?: Array
    attributes?: Object
    freeText?: String
  }
  tolerance: JSONB (nullable) {
    boundaryIouThreshold?: Number
    labelExactMatch?: Boolean
    attributeMatch?: Enum [exact, partial, none]
    scoreWeights?: {
      labelF1?: Number
      boundaryIou?: Number
      attributeMatch?: Number
    }
  }
  createdBy: UUID (FK -> User)
  isActive: Boolean (default: true)
}
```

**Indexes:** `taskId` (unique), `projectId`

### 13. User
Represents all platform users. In development, stored in `mock-users.json`; in production, backed by Okta.

**Table:** `users`

```
User extends BaseEntity {
  email: String (255, unique)
  username: String (100, unique)
  firstName: String (100)
  lastName: String (100)
  role: Enum [ANNOTATOR, REVIEWER, QA, PROJECT_MANAGER, ADMIN, CUSTOMER]
  status: Enum [ACTIVE, INACTIVE, SUSPENDED]
  skills: JSONB (nullable) Array<{
    skillName: String
    proficiency: Enum [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT]
    certifiedAt: Timestamp
  }>
  performanceMetrics: JSONB (nullable) {
    tasksCompleted: Integer
    averageQuality: Decimal
    averageSpeed: Decimal
    accuracyRate: Decimal
  }
  availability: JSONB (nullable) {
    timezone: String
    workingHours: Object
    capacity: Integer
  }
  lastLoginAt: Timestamp (nullable)
}
```

**Default Permissions by Role:**
- `ADMIN`: `['*']`
- `PROJECT_MANAGER`: project/batch/workflow CRUD, task read/assign, user read
- `ANNOTATOR`: task read/claim/submit, annotation CRUD
- `REVIEWER`: task read, annotation read/review/approve/reject, quality read
- `CUSTOMER`: project/batch read, report read, export download

**Indexes:** `email` (unique), `username` (unique), `role`, `status`

---

### 14. ProjectTeamMember
Junction table mapping users to projects with role-specific configuration.

**Table:** `project_team_members`

```
ProjectTeamMember extends BaseEntity {
  projectId: UUID (FK -> Project)
  userId: UUID (FK -> User)
  role: String
  quota: Integer (nullable)        // max tasks per day
  isActive: Boolean (default: true)
  assignedAt: Timestamp
}
```

### 15. Queue
Manages task distribution and prioritization queues.

**Table:** `queues`

```
Queue extends BaseEntity {
  name: String
  projectId: UUID (FK -> Project)
  queueType: Enum [ANNOTATION, REVIEW, VALIDATION, CONSENSUS]
  status: Enum [ACTIVE, PAUSED, ARCHIVED]
  priorityRules: JSONB {
    priorityField: String
    sortOrder: String   // ASC, DESC
    filters: Array
  }
  assignmentRules: JSONB {
    autoAssign: Boolean
    capacityLimits: Object
    skillRequirements: Array
    loadBalancing: Object
  }
  totalTasks: Integer
  pendingTasks: Integer
}
```

**Indexes:** `projectId`, `queueType`, `status`

### 16. Workflow
Defines XState state machine workflows. Used by tasks and workflow instances.

**Table:** `workflows`

```
Workflow extends BaseEntity {
  projectId: UUID (FK -> Project, nullable)
  name: String
  description: Text (nullable)
  version: Integer
  xstateDefinition: JSONB {
    id: String
    initial: String
    context: Object
    states: Object {
      [state_name]: {
        on: Object          // event transitions
        entry: Array        // entry actions
        exit: Array         // exit actions
        after: Object       // delayed transitions
        invoke: Object      // service invocations
        meta: Object
        type: Enum [atomic, compound, parallel, final, history]
        states: Object      // nested states
      }
    }
    guards: Object
    actions: Object
    services: Object
    delays: Object
  }
  stateSchema: JSONB {
    states: Object
    context: Object
  }
  eventSchema: JSONB Array<{
    eventType: String
    payloadSchema: Object
    description: String
  }>
  visualizationConfig: JSONB (nullable) {
    layout: String
    nodePositions: Object
    styling: Object
  }
  status: Enum [DRAFT, ACTIVE, INACTIVE, DEPRECATED]
  isTemplate: Boolean (default: false)
  parentWorkflowId: UUID (FK -> Workflow, nullable)
  createdBy: UUID (FK -> User)
}
```

**Indexes:** `projectId`, `status`, `version`, `isTemplate`

### 17. WorkflowInstance
Active XState machine instances for complex multi-task workflows.

**Table:** `workflow_instances`

```
WorkflowInstance extends BaseEntity {
  workflowId: UUID (FK -> Workflow)
  batchId: UUID (FK -> Batch, nullable)
  name: String
  actorState: JSONB {
    value: String | Object
    context: Object
    children: Object
    history: Object
    done: Boolean
    tags: String[]
  }
  parentInstanceId: UUID (FK -> WorkflowInstance, nullable)
  actorType: Enum [ROOT, CHILD, INVOKED]
  actorRefId: String (nullable)
  parallelStates: JSONB (nullable) {
    regions: Object
  }
  snapshot: JSONB (nullable)
  checkpointAt: Timestamp (nullable)
  status: Enum [RUNNING, PAUSED, COMPLETED, FAILED, STOPPED]
  startedAt: Timestamp (nullable)
  completedAt: Timestamp (nullable)
  error: JSONB (nullable)
}
```

**Indexes:** `workflowId`, `batchId`, `status`, `actorType`, `parentInstanceId`
**Composite Indexes:** `(batchId, status)`

---

### 18. StateTransition
Immutable audit log of all XState machine transitions.

**Table:** `state_transitions`

```
StateTransition extends BaseEntity {
  entityType: Enum [TASK, BATCH, ASSIGNMENT, WORKFLOW_INSTANCE]
  entityId: UUID
  workflowId: UUID (FK -> Workflow)
  event: JSONB {
    type: String
    payload: Object
    timestamp: Timestamp
    origin: String
  }
  fromState: JSONB {
    value: String | Object
    context: Object
    tags: String[]
  }
  toState: JSONB {
    value: String | Object
    context: Object
    tags: String[]
  }
  transitionType: Enum [EXTERNAL, INTERNAL, DELAYED, GUARDED, ALWAYS]
  guardsEvaluated: JSONB Array<{
    guardName: String
    result: Boolean
    condition: String
  }>
  actionsExecuted: JSONB Array<{
    actionName: String
    actionType: Enum [ENTRY, EXIT, TRANSITION, ASSIGN]
    executionTime: Integer   // milliseconds
    result: Object
  }>
  userId: UUID (FK -> User, nullable)
  triggeredBy: Enum [USER_ACTION, SYSTEM, TIMER, WEBHOOK, SERVICE]
  duration: Integer (milliseconds, nullable)
  isAutomatic: Boolean (default: false)
  error: JSONB (nullable)
}
```

**Indexes:** `entityType`, `entityId`, `workflowId`, `createdAt`, `userId`
**Composite Indexes:** `(entityType, entityId, createdAt)`, `(workflowId, event.type, createdAt)`

---

### 19. Export
Tracks batch data exports.

**Table:** `exports`

```
Export extends BaseEntity {
  batchId: UUID (FK -> Batch)
  projectId: UUID (FK -> Project)
  exportType: Enum [FULL, INCREMENTAL, FILTERED]
  format: Enum [JSON, JSONL, CSV, COCO, PASCAL_VOC, CUSTOM]
  status: Enum [PENDING, PROCESSING, COMPLETED, FAILED]
  fileUrl: String (nullable)
  fileSize: BigInt (bytes, nullable)
  recordCount: Integer (nullable)
  filterCriteria: JSONB (nullable)
  configuration: JSONB {
    includeMetadata: Boolean
    includeQualityMetrics: Boolean
    anonymize: Boolean
    compression: String
  }
  requestedBy: UUID (FK -> User)
  completedAt: Timestamp (nullable)
  expiresAt: Timestamp (nullable)
  errorMessage: Text (nullable)
}
```

**Indexes:** `batchId`, `projectId`, `status`, `createdAt`

### 20. AuditLog
Comprehensive activity tracking for compliance and debugging.

**Table:** `audit_logs`

```
AuditLog extends BaseEntity {
  entityType: String
  entityId: UUID
  action: Enum [CREATE, READ, UPDATE, DELETE, ASSIGN, SUBMIT, APPROVE, REJECT, EXPORT]
  userId: UUID (FK -> User)
  timestamp: Timestamp
  ipAddress: String (nullable)
  userAgent: String (nullable)
  changes: JSONB (nullable) {
    before: Object
    after: Object
  }
}
```

**Indexes:** `entityType`, `entityId`, `userId`, `timestamp`, `action`
**Composite Indexes:** `(entityType, entityId, timestamp)`

### 21. Notification
User notifications for system events.

**Table:** `notifications`

```
Notification extends BaseEntity {
  userId: UUID (FK -> User)
  type: Enum [TASK_ASSIGNED, TASK_EXPIRED, FEEDBACK_RECEIVED, BATCH_COMPLETED, SYSTEM_ALERT]
  priority: Enum [LOW, MEDIUM, HIGH, URGENT]
  title: String
  message: Text
  link: String (nullable)
  isRead: Boolean (default: false)
  readAt: Timestamp (nullable)
  expiresAt: Timestamp (nullable)
}
```

**Indexes:** `userId`, `isRead`, `createdAt`

### 22. Comment
Collaborative comments on tasks.

**Table:** `comments`

```
Comment extends BaseEntity {
  taskId: UUID (FK -> Task)
  userId: UUID (FK -> User)
  parentCommentId: UUID (FK -> Comment, nullable)
  content: Text
  attachments: JSONB (nullable)
  isResolved: Boolean (default: false)
  resolvedAt: Timestamp (nullable)
  resolvedBy: UUID (FK -> User, nullable)
}
```

### 23. Template
Reusable annotation schemas and configurations.

**Table:** `templates`

```
Template extends BaseEntity {
  name: String
  category: String
  templateType: Enum [ANNOTATION_SCHEMA, UI_CONFIG, QUALITY_RULES, WORKFLOW]
  content: JSONB
  isPublic: Boolean (default: false)
  createdBy: UUID (FK -> User)
  usageCount: Integer (default: 0)
}
```

---

### 24. PluginSecret
Encrypted secrets scoped to projects for use in API plugins.

**Table:** `plugin_secrets`

```
PluginSecret extends BaseEntity {
  projectId: UUID (FK -> Project)
  name: String (255)
  value: Text (encrypted)
  description: String (nullable)
  createdBy: UUID (nullable)
}
```

**Unique Constraint:** `(projectId, name)`

---

### 25. PluginExecutionLog
Audit log for plugin executions. Answer values are never stored.

**Table:** `plugin_execution_logs`

```
PluginExecutionLog extends BaseEntity {
  projectId: UUID (FK -> Project)
  taskId: UUID (nullable)
  pluginId: String
  pluginName: String
  trigger: Enum [ON_BLUR, ON_SUBMIT]
  result: Enum [PASS, WARN, FAIL]
  durationMs: Integer
  error: Text (nullable)
  executedAt: Timestamp
}
```

---

## Relationships

### One-to-Many
- `Customer` → `Project` (1:N)
- `Project` → `Batch` (1:N)
- `Project` → `Task` (1:N)
- `Project` → `Queue` (1:N)
- `Project` → `Workflow` (1:N)
- `Project` → `ProjectTeamMember` (1:N)
- `Workflow` → `Task` (1:N)
- `Workflow` → `WorkflowInstance` (1:N)
- `Workflow` → `StateTransition` (1:N)
- `Batch` → `Task` (1:N)
- `Batch` → `Export` (1:N)
- `Batch` → `WorkflowInstance` (1:N)
- `Task` → `Assignment` (1:N)
- `Task` → `Annotation` (1:N)
- `Task` → `QualityCheck` (1:N)
- `Task` → `ReviewApproval` (1:N)
- `Task` → `AnnotationResponse` (1:N)
- `Task` → `Comment` (1:N)
- `Task` → `GoldTask` (1:1)
- `Assignment` → `Annotation` (1:N)
- `Assignment` → `AnnotationResponse` (1:N)
- `Assignment` → `ReviewApproval` (1:N)
- `Annotation` → `QualityCheck` (1:N)
- `Annotation` → `AnnotationResponse` (1:N)
- `Annotation` → `AnnotationVersion` (1:N)
- `WorkflowInstance` → `WorkflowInstance` (1:N, parent-child actors)
- `WorkflowInstance` → `StateTransition` (1:N)
- `User` → `Assignment` (1:N)
- `User` → `Annotation` (1:N)
- `User` → `QualityCheck` (1:N as reviewer)
- `User` → `ReviewApproval` (1:N as reviewer)
- `User` → `AuditLog` (1:N)
- `User` → `Notification` (1:N)
- `User` → `StateTransition` (1:N)
- `User` → `ProjectTeamMember` (1:N)
- `Comment` → `Comment` (1:N, parent-child)

### Many-to-Many (via junction tables)
- `User` ↔ `Project` (via `ProjectTeamMember`)
- `Task` ↔ `User` (via `Assignment`)

---

## Enumerations Reference

| Enum | Values |
|------|--------|
| `ProjectType` | TEXT, IMAGE, VIDEO, AUDIO, MULTIMODAL |
| `ProjectStatus` | DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED |
| `CustomerStatus` | ACTIVE, INACTIVE, SUSPENDED |
| `BatchStatus` | CREATED, IN_PROGRESS, REVIEW, COMPLETED, EXPORTED |
| `TaskType` | ANNOTATION, REVIEW, VALIDATION, CONSENSUS |
| `TaskStatus` | QUEUED, ASSIGNED, IN_PROGRESS, IN_REVIEW, SUBMITTED, APPROVED, REJECTED, SKIPPED |
| `AssignmentStatus` | ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, EXPIRED, REASSIGNED |
| `AssignmentMethod` | AUTOMATIC, MANUAL, CLAIMED |
| `WorkflowStage` | ANNOTATION, REVIEW, VALIDATION, CONSENSUS |
| `UserRole` | ANNOTATOR, REVIEWER, QA, PROJECT_MANAGER, ADMIN, CUSTOMER |
| `UserStatus` | ACTIVE, INACTIVE, SUSPENDED |
| `SkillProficiency` | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |
| `QueueType` | ANNOTATION, REVIEW, VALIDATION, CONSENSUS |
| `QueueStatus` | ACTIVE, PAUSED, ARCHIVED |
| `WorkflowStatus` | DRAFT, ACTIVE, INACTIVE, DEPRECATED |
| `ExportType` | FULL, INCREMENTAL, FILTERED |
| `ExportFormat` | JSON, JSONL, CSV, COCO, PASCAL_VOC, CUSTOM |
| `ExportStatus` | PENDING, PROCESSING, COMPLETED, FAILED |
| `QualityCheckType` | AUTOMATED, MANUAL, CONSENSUS, GOLD_STANDARD |
| `QualityCheckStatus` | PASS, FAIL, NEEDS_REVISION, DISPUTED |
| `IssueSeverity` | LOW, MEDIUM, HIGH, CRITICAL |
| `ReviewApprovalStatus` | PENDING, APPROVED, REJECTED, CHANGES_REQUESTED |
| `WorkflowInstanceStatus` | RUNNING, PAUSED, COMPLETED, FAILED, STOPPED |
| `ActorType` | ROOT, CHILD, INVOKED |
| `TransitionType` | EXTERNAL, INTERNAL, DELAYED, GUARDED, ALWAYS |
| `EventTrigger` | USER_ACTION, SYSTEM, TIMER, WEBHOOK, SERVICE |
| `TemplateType` | ANNOTATION_SCHEMA, UI_CONFIG, QUALITY_RULES, WORKFLOW |
| `StateTransitionEntityType` | TASK, BATCH, ASSIGNMENT, WORKFLOW_INSTANCE |
| `NotificationType` | TASK_ASSIGNED, TASK_EXPIRED, FEEDBACK_RECEIVED, BATCH_COMPLETED, SYSTEM_ALERT |
| `Priority` | LOW, MEDIUM, HIGH, URGENT |
| `AnnotationQuestionType` | MULTI_SELECT, TEXT, SINGLE_SELECT, NUMBER, DATE |
| `PluginType` | API, SCRIPT |
| `PluginTrigger` | ON_BLUR, ON_SUBMIT |
| `PluginFailBehavior` | HARD_BLOCK, SOFT_WARN, ADVISORY |

---

## Constraints

### Unique Constraints
- `User.email`
- `User.username`
- `GoldTask.taskId` (one gold standard per task)
- `PluginSecret.(projectId, name)`

### Check Constraints
- `priority` values between 1-10
- `qualityScore` between 0-100
- `confidenceScore` (Annotation) between 0-1
- `confidenceScore` (AnnotationResponse) between 0-100
- `reviewLevel` between 1-5

### Foreign Key Policies
- `ON DELETE CASCADE`: AuditLog, Notification, Comment, AnnotationResponse, ReviewApproval, GoldTask
- `ON DELETE SET NULL`: `createdBy`, `defaultWorkflowId`
- `ON DELETE RESTRICT`: Project, Batch, Task (core entities)

---

## Data Retention Policies

- **Active Data**: Projects in ACTIVE status
- **Archived Data**: Projects older than 2 years in COMPLETED/ARCHIVED status
- **Audit Logs**: Retained for 7 years for compliance
- **State Transitions**: Full history retained; transitions older than 90 days archived
- **Exports**: Temporary files deleted after 30 days (metadata retained)
- **Plugin Execution Logs**: 90-day rolling retention
- **Soft Deletes**: Implemented for User, Project, Batch (status = ARCHIVED/INACTIVE)

---

## Scalability Considerations

### Partitioning
- `Task` table: partitioned by `createdAt` (monthly)
- `StateTransition`: partitioned by `createdAt` (daily for high volume)
- `AuditLog`: partitioned by `timestamp` (weekly)
- `Annotation`: partitioned by `projectId`

### Archiving
- Completed projects older than 1 year → cold storage
- Historical state transitions older than 90 days → archive
- Historical audit logs → separate archive database

### Caching (Redis)
- User profiles and JWT sessions (Auth Service)
- Active project configurations including annotation questions and plugin definitions
- **XState workflow definitions** (compiled machine cache)
- **Current task machine states** (fast state lookups)
- Queue statistics and pending task counts

### Read Replicas
- Reporting and analytics queries
- Export generation
- Dashboard metrics
- State transition history queries

### XState-Specific Optimizations
- **State Machine Cache**: Compiled XState machine definitions cached in-memory
- **Actor Registry**: Active actor references maintained in Redis
- **Event Queue**: Kafka message queue for async event processing between services
- **Snapshot Storage**: Periodic snapshots of long-running workflow instances
- **Context Compression**: Large machine contexts compressed in storage

---

## Performance & Scalability Implementation

### Connection Pools
Each service configures TypeORM's `extra.max` pool via `DB_POOL_SIZE` env var:

| Service | Default Pool Size |
|---------|------------------|
| Task Management | 20 |
| Project Management | 20 |
| Annotation QA | 15 |
| Workflow Engine | 15 |
| Auth Service | 10 |

In production, a **PgBouncer** instance in transaction-pooling mode sits in front of Postgres to multiplex these pools down to 30–40 actual server connections.

### Redis Task Queue
Task claiming uses Redis sorted sets instead of SELECT queries to eliminate race conditions at scale.

**Key schema**: `task_queue:{projectId}:{taskType}` and `task_queue:{projectId}:ALL`

**Score formula**: `(10 - priority) × 1e10 + unix_created_at_seconds`
- Lower score = dequeued first (`ZPOPMIN`)
- Priority 10 + oldest created = smallest score = first out

**Lifecycle**:
1. Task created → `ZADD NX` to both keys
2. Annotator claims → `ZPOPMIN` (atomic) → assign in Postgres
3. Manual assignment / status change → `ZREM` from queue

**Fallback**: If Redis is cold (restart), `getNextTask` falls back to `SELECT FOR UPDATE SKIP LOCKED` in a Postgres transaction, and re-populates Redis as it goes.

### Assignment Locks
Short-lived Redis locks prevent double-assignment during the `dequeue → Postgres write` window:

**Key**: `assignment_lock:{taskId}`
**Value**: `userId` who holds the lock
**TTL**: 30 seconds (auto-expires on crash)
**Mechanism**: `SET NX PX 30000` — atomic, only one caller wins

### Performance Indexes
Applied via [`libs/common/src/database/migrations/001_performance_indexes.sql`](../libs/common/src/database/migrations/001_performance_indexes.sql). All use `CREATE INDEX CONCURRENTLY IF NOT EXISTS` for zero-downtime deployment.

| Index | Table | Type | Purpose |
|-------|-------|------|---------|
| `idx_tasks_claim` | `tasks` | B-tree partial (`WHERE status='QUEUED'`) | Task claim hot path — only indexes claimable rows |
| `idx_tasks_project_status_priority` | `tasks` | B-tree composite | List/filter endpoints |
| `idx_tasks_machine_state_gin` | `tasks` | GIN | JSON operator queries on `machine_state` (stage routing) |
| `idx_tasks_annotation_responses_gin` | `tasks` | GIN | Denormalized annotation response searches |
| `idx_assignments_task_user_status` | `assignments` | B-tree | Duplicate-assignment check per user+task |
| `idx_assignments_expiry` | `assignments` | B-tree partial (`WHERE status='ASSIGNED'`) | Assignment expiry background job |
| `idx_assignments_task_stage_status` | `assignments` | B-tree | Stage assignment count subquery |
| `idx_annotations_data_gin` | `annotations` | GIN | Annotation content search (label/span) |
| `idx_annotations_task_is_final` | `annotations` | B-tree | QA service annotation fetches |
| `idx_annotation_responses_task_question` | `annotation_responses` | B-tree | Per-question response lookup |
| `idx_review_approvals_task_level_status` | `review_approvals` | B-tree | Multi-level review queries |
| `idx_state_transitions_entity_time` | `state_transitions` | B-tree | Audit log queries per entity |
| `idx_state_transitions_workflow_time` | `state_transitions` | B-tree | Workflow transition analytics |
| `idx_quality_checks_task_type_status` | `quality_checks` | B-tree | Project metrics aggregation |
| `idx_notifications_user_unread` | `notifications` | B-tree partial (`WHERE is_read=false`) | Unread notification fetch |
| `idx_audit_logs_entity_time` | `audit_logs` | B-tree | Time-range audit queries |
| `idx_plugin_logs_project_time` | `plugin_execution_logs` | B-tree | Recent plugin log queries |

### Table Partitioning (Production)
High-volume append-only tables should be partitioned by time. See the migration file for DDL examples.

| Table | Partition By | Interval | Retention |
|-------|-------------|----------|-----------|
| `state_transitions` | `created_at` | Daily | Full history; archive >90 days |
| `audit_logs` | `timestamp` | Weekly | 7 years (compliance) |
| `plugin_execution_logs` | `executed_at` | Monthly | 90 days — drop old partitions |

### Read Replica Routing
The following endpoints should be routed to a read replica via TypeORM replication config or a separate `DataSource`:
- `GET /projects/:id/statistics`
- `GET /batches/:id/statistics`
- `GET /quality-checks/project/:id/metrics`
- `GET /tasks/time-analytics`
- `GET /state-transitions` (audit reads)
- `GET /audit-logs`
