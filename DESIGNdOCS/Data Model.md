# Welo Data Annotation Platform - Data Model

## Overview
This document defines the core data entities for the Welo Data Annotation Platform, designed to support centralized queueing, task workflows, annotation interfaces, operational tooling, quality processes, and batch-level data export.

---

## Core Entities

### 1. Project
Represents a customer annotation project with specific configuration and requirements.

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

```
Customer {
  id: UUID (PK)
  name: String
  organization: String
  contact_email: String
  contact_phone: String
  billing_info: JSON
  status: Enum [ACTIVE, INACTIVE, SUSPENDED]
  created_at: Timestamp
  updated_at: Timestamp
  metadata: JSON
}
```

### 3. Batch
Represents a collection of tasks grouped for processing and export.

```
Batch {
  id: UUID (PK)
  project_id: UUID (FK -> Project)
  name: String
  description: Text
  status: Enum [CREATED, IN_PROGRESS, REVIEW, COMPLETED, EXPORTED]
  priority: Integer (1-10)
  total_tasks: Integer
  completed_tasks: Integer
  quality_score: Decimal
  configuration: JSON {
    assignment_rules: Object
    validation_rules: Object
    export_settings: Object
  }
  created_at: Timestamp
  updated_at: Timestamp
  due_date: Timestamp
  completed_at: Timestamp
  metadata: JSON
}
```

### 4. Task
Individual annotation unit within a batch with XState machine instance.

```
Task {
  id: UUID (PK)
  batch_id: UUID (FK -> Batch)
  project_id: UUID (FK -> Project)
  workflow_id: UUID (FK -> Workflow)
  external_id: String (unique within project)
  task_type: Enum [ANNOTATION, REVIEW, VALIDATION, CONSENSUS]
  status: Enum [QUEUED, ASSIGNED, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED, SKIPPED]
  priority: Integer (1-10)
  
  # XState Machine State
  machine_state: JSON {
    value: String | Object (current state value, supports nested/parallel)
    context: Object (current machine context data)
    history: Object (history state values)
    done: Boolean
    changed: Boolean
    tags: Array<String>
  }
  previous_state: JSON (previous machine state for rollback)
  state_updated_at: Timestamp
  
  data_payload: JSON {
    source_data: Object
    references: Array
    context: Object
  }
  assignment_id: UUID (FK -> Assignment)
  attempt_count: Integer
  created_at: Timestamp
  updated_at: Timestamp
  assigned_at: Timestamp
  started_at: Timestamp
  submitted_at: Timestamp
  due_date: Timestamp
  estimated_duration: Integer (seconds)
  actual_duration: Integer (seconds)
  metadata: JSON
}
```

### 5. Assignment
Links tasks to annotators with workflow stage information.

```
Assignment {
  id: UUID (PK)
  task_id: UUID (FK -> Task)
  user_id: UUID (FK -> User)
  workflow_stage: Enum [ANNOTATION, REVIEW, VALIDATION, CONSENSUS]
  status: Enum [ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, EXPIRED, REASSIGNED]
  assigned_at: Timestamp
  accepted_at: Timestamp
  completed_at: Timestamp
  expires_at: Timestamp
  assignment_method: Enum [AUTOMATIC, MANUAL, CLAIMED]
  metadata: JSON
}
```

### 6. Annotation
Stores the actual annotation data produced by annotators.

```
Annotation {
  id: UUID (PK)
  task_id: UUID (FK -> Task)
  assignment_id: UUID (FK -> Assignment)
  user_id: UUID (FK -> User)
  annotation_data: JSON {
    labels: Array
    spans: Array
    entities: Array
    relationships: Array
    attributes: Object
    free_text: String
  }
  version: Integer
  is_final: Boolean
  confidence_score: Decimal
  time_spent: Integer (seconds)
  tool_version: String
  created_at: Timestamp
  updated_at: Timestamp
  submitted_at: Timestamp
  metadata: JSON
}
```

### 7. QualityCheck
Records quality assessment results for tasks and annotations.

```
QualityCheck {
  id: UUID (PK)
  task_id: UUID (FK -> Task)
  annotation_id: UUID (FK -> Annotation)
  reviewer_id: UUID (FK -> User)
  check_type: Enum [AUTOMATED, MANUAL, CONSENSUS, GOLD_STANDARD]
  status: Enum [PASS, FAIL, NEEDS_REVISION, DISPUTED]
  quality_score: Decimal (0-100)
  issues: JSON [{
    category: String
    severity: Enum [LOW, MEDIUM, HIGH, CRITICAL]
    description: String
    location: Object
  }]
  feedback: Text
  corrected_annotation_id: UUID (FK -> Annotation)
  created_at: Timestamp
  updated_at: Timestamp
  resolved_at: Timestamp
  metadata: JSON
}
```

### 8. User
Represents all platform users (annotators, reviewers, admins, customers).

```
User {
  id: UUID (PK)
  email: String (unique)
  username: String (unique)
  first_name: String
  last_name: String
  role: Enum [ANNOTATOR, REVIEWER, QA, PROJECT_MANAGER, ADMIN, CUSTOMER]
  status: Enum [ACTIVE, INACTIVE, SUSPENDED]
  skills: JSON [{
    skill_name: String
    proficiency: Enum [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT]
    certified_at: Timestamp
  }]
  performance_metrics: JSON {
    tasks_completed: Integer
    average_quality: Decimal
    average_speed: Decimal
    accuracy_rate: Decimal
  }
  availability: JSON {
    timezone: String
    working_hours: Object
    capacity: Integer
  }
  created_at: Timestamp
  updated_at: Timestamp
  last_login_at: Timestamp
  metadata: JSON
}
```

### 9. Queue
Manages task distribution and prioritization.

```
Queue {
  id: UUID (PK)
  name: String
  project_id: UUID (FK -> Project)
  queue_type: Enum [ANNOTATION, REVIEW, VALIDATION, CONSENSUS]
  status: Enum [ACTIVE, PAUSED, ARCHIVED]
  priority_rules: JSON {
    priority_field: String
    sort_order: String
    filters: Array
  }
  assignment_rules: JSON {
    auto_assign: Boolean
    capacity_limits: Object
    skill_requirements: Array
    load_balancing: Object
  }
  total_tasks: Integer
  pending_tasks: Integer
  created_at: Timestamp
  updated_at: Timestamp
  metadata: JSON
}
```

### 10. Workflow
Defines multi-stage annotation workflows using XState state machine definitions.

```
Workflow {
  id: UUID (PK)
  project_id: UUID (FK -> Project)
  name: String
  description: Text
  version: Integer
  xstate_definition: JSON {
    id: String
    initial: String
    context: Object
    states: Object {
      [state_name]: {
        on: Object (event transitions)
        entry: Array (entry actions)
        exit: Array (exit actions)
        after: Object (delayed transitions)
        invoke: Object (service invocations)
        meta: Object
        type: Enum [atomic, compound, parallel, final, history]
        states: Object (nested states for hierarchical)
      }
    }
    guards: Object (condition functions)
    actions: Object (action definitions)
    services: Object (async service definitions)
    delays: Object (delay definitions)
  }
  state_schema: JSON {
    states: Object (state value types)
    context: Object (context shape definition)
  }
  event_schema: JSON [{
    event_type: String
    payload_schema: Object
    description: String
  }]
  visualization_config: JSON {
    layout: String
    node_positions: Object
    styling: Object
  }
  status: Enum [DRAFT, ACTIVE, INACTIVE, DEPRECATED]
  is_template: Boolean
  parent_workflow_id: UUID (FK -> Workflow)
  created_at: Timestamp
  updated_at: Timestamp
  created_by: UUID (FK -> User)
  metadata: JSON
}
```

### 11. Export
Tracks batch data exports.

```
Export {
  id: UUID (PK)
  batch_id: UUID (FK -> Batch)
  project_id: UUID (FK -> Project)
  export_type: Enum [FULL, INCREMENTAL, FILTERED]
  format: Enum [JSON, JSONL, CSV, COCO, PASCAL_VOC, CUSTOM]
  status: Enum [PENDING, PROCESSING, COMPLETED, FAILED]
  file_url: String
  file_size: BigInteger (bytes)
  record_count: Integer
  filter_criteria: JSON
  configuration: JSON {
    include_metadata: Boolean
    include_quality_metrics: Boolean
    anonymize: Boolean
    compression: String
  }
  requested_by: UUID (FK -> User)
  created_at: Timestamp
  completed_at: Timestamp
  expires_at: Timestamp
  error_message: Text
  metadata: JSON
}
```

### 12. AuditLog
Comprehensive activity tracking for compliance and debugging.

```
AuditLog {
  id: UUID (PK)
  entity_type: String
  entity_id: UUID
  action: Enum [CREATE, READ, UPDATE, DELETE, ASSIGN, SUBMIT, APPROVE, REJECT, EXPORT]
  user_id: UUID (FK -> User)
  timestamp: Timestamp
  ip_address: String
  user_agent: String
  changes: JSON {
    before: Object
    after: Object
  }
  metadata: JSON
}
```

### 13. Notification
User notifications for system events.

```
Notification {
  id: UUID (PK)
  user_id: UUID (FK -> User)
  type: Enum [TASK_ASSIGNED, TASK_EXPIRED, FEEDBACK_RECEIVED, BATCH_COMPLETED, SYSTEM_ALERT]
  priority: Enum [LOW, MEDIUM, HIGH, URGENT]
  title: String
  message: Text
  link: String
  is_read: Boolean
  created_at: Timestamp
  read_at: Timestamp
  expires_at: Timestamp
  metadata: JSON
}
```

### 14. Comment
Collaborative comments on tasks and annotations.

```
Comment {
  id: UUID (PK)
  entity_type: Enum [TASK, ANNOTATION, QUALITY_CHECK, BATCH]
  entity_id: UUID
  user_id: UUID (FK -> User)
  parent_comment_id: UUID (FK -> Comment)
  content: Text
  attachments: JSON
  is_resolved: Boolean
  created_at: Timestamp
  updated_at: Timestamp
  resolved_at: Timestamp
  resolved_by: UUID (FK -> User)
}
```

### 15. Template
Reusable annotation schemas and configurations.

```
Template {
  id: UUID (PK)
  name: String
  category: String
  template_type: Enum [ANNOTATION_SCHEMA, UI_CONFIG, QUALITY_RULES, WORKFLOW]
  content: JSON
  is_public: Boolean
  created_by: UUID (FK -> User)
  created_at: Timestamp
  updated_at: Timestamp
  usage_count: Integer
  metadata: JSON
}
```

### 16. StateTransition
Logs XState machine transitions and events for tasks and workflows.

```
StateTransition {
  id: UUID (PK)
  entity_type: Enum [TASK, BATCH, ASSIGNMENT, WORKFLOW_INSTANCE]
  entity_id: UUID
  workflow_id: UUID (FK -> Workflow)
  
  # XState Event Details
  event: JSON {
    type: String (event type)
    payload: Object (event data)
    timestamp: Timestamp
    origin: String (event source)
  }
  
  # State Transition
  from_state: JSON {
    value: String | Object
    context: Object
    tags: Array<String>
  }
  to_state: JSON {
    value: String | Object
    context: Object
    tags: Array<String>
  }
  
  # Transition Metadata
  transition_type: Enum [EXTERNAL, INTERNAL, DELAYED, GUARDED, ALWAYS]
  guards_evaluated: JSON [{
    guard_name: String
    result: Boolean
    condition: String
  }]
  actions_executed: JSON [{
    action_name: String
    action_type: Enum [ENTRY, EXIT, TRANSITION, ASSIGN]
    execution_time: Integer (milliseconds)
    result: Object
  }]
  
  user_id: UUID (FK -> User)
  triggered_by: Enum [USER_ACTION, SYSTEM, TIMER, WEBHOOK, SERVICE]
  duration: Integer (milliseconds)
  is_automatic: Boolean
  error: JSON {
    message: String
    stack: String
    code: String
  }
  
  created_at: Timestamp
  metadata: JSON
}
```

### 17. WorkflowInstance
Active XState machine instances for complex multi-task workflows.

```
WorkflowInstance {
  id: UUID (PK)
  workflow_id: UUID (FK -> Workflow)
  batch_id: UUID (FK -> Batch)
  name: String
  
  # XState Actor State
  actor_state: JSON {
    value: String | Object (current state)
    context: Object (shared context across tasks)
    children: Object (spawned child actors)
    history: Object
    done: Boolean
    tags: Array<String>
  }
  
  # Actor Management
  parent_instance_id: UUID (FK -> WorkflowInstance)
  actor_type: Enum [ROOT, CHILD, INVOKED]
  actor_ref_id: String (XState actor reference)
  
  # Parallel States (for parallel workflows)
  parallel_states: JSON {
    regions: Object (multiple active states)
  }
  
  # Persistence
  snapshot: JSON (full persisted state for restore)
  checkpoint_at: Timestamp
  
  status: Enum [RUNNING, PAUSED, COMPLETED, FAILED, STOPPED]
  started_at: Timestamp
  completed_at: Timestamp
  error: JSON
  
  created_at: Timestamp
  updated_at: Timestamp
  metadata: JSON
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
- `Workflow` → `Task` (1:N)
- `Workflow` → `WorkflowInstance` (1:N)
- `Workflow` → `StateTransition` (1:N)
- `Batch` → `Task` (1:N)
- `Batch` → `Export` (1:N)
- `Batch` → `WorkflowInstance` (1:N)
- `Task` → `Assignment` (1:N)
- `Task` → `Annotation` (1:N)
- `Task` → `QualityCheck` (1:N)
- `Task` → `StateTransition` (1:N)
- `WorkflowInstance` → `WorkflowInstance` (1:N, parent-child actors)
- `WorkflowInstance` → `StateTransition` (1:N)
- `Assignment` → `Annotation` (1:1 or 1:N)
- `Annotation` → `QualityCheck` (1:N)
- `User` → `Assignment` (1:N)
- `User` → `Annotation` (1:N)
- `User` → `QualityCheck` (1:N as reviewer)
- `User` → `AuditLog` (1:N)
- `User` → `Notification` (1:N)
- `User` → `StateTransition` (1:N)
- `Comment` → `Comment` (1:N, parent-child)

### Many-to-Many (via junction tables if needed)
- `User` ↔ `Project` (via `ProjectMember` table)
- `Task` ↔ `User` (via `Assignment` table)

---

## Indexes

### Primary Indexes
- All `id` fields (primary keys)

### Secondary Indexes
- `Project`: `customer_id`, `status`, `created_at`, `default_workflow_id`
- `Batch`: `project_id`, `status`, `priority`, `due_date`
- `Task`: `batch_id`, `project_id`, `workflow_id`, `status`, `priority`, `assigned_at`, `due_date`, `state_updated_at`
- `Assignment`: `task_id`, `user_id`, `status`, `assigned_at`
- `Annotation`: `task_id`, `user_id`, `submitted_at`, `is_final`
- `QualityCheck`: `task_id`, `annotation_id`, `reviewer_id`, `check_type`, `status`
- `User`: `email`, `username`, `role`, `status`
- `Queue`: `project_id`, `queue_type`, `status`
- `Workflow`: `project_id`, `status`, `version`, `is_template`
- `WorkflowInstance`: `workflow_id`, `batch_id`, `status`, `actor_type`, `parent_instance_id`
- `StateTransition`: `entity_type`, `entity_id`, `workflow_id`, `created_at`, `user_id`
- `Export`: `batch_id`, `project_id`, `status`, `created_at`
- `AuditLog`: `entity_type`, `entity_id`, `user_id`, `timestamp`, `action`
- `Notification`: `user_id`, `is_read`, `created_at`

### Composite Indexes
- `Task`: (`project_id`, `status`, `priority`), (`workflow_id`, `machine_state.value`)
- `Assignment`: (`user_id`, `status`, `assigned_at`)
- `Annotation`: (`task_id`, `version`)
- `StateTransition`: (`entity_type`, `entity_id`, `created_at`), (`workflow_id`, `event.type`, `created_at`)
- `WorkflowInstance`: (`batch_id`, `status`), (`workflow_id`, `actor_state.value`)
- `AuditLog`: (`entity_type`, `entity_id`, `timestamp`)

---

## Constraints

### Unique Constraints
- `User.email`
- `User.username`
- `Task.external_id` (per project)

### Check Constraints
- `priority` values between 1-10
- `quality_score` between 0-100
- `confidence_score` between 0-1
- Status transitions follow valid state machines

### Foreign Key Constraints
- All FK relationships defined with CASCADE or SET NULL policies based on business rules
- `ON DELETE CASCADE`: AuditLog, Notification, Comment
- `ON DELETE SET NULL`: created_by, updated_by references
- `ON DELETE RESTRICT`: Core entities (Project, Batch, Task)

---

## Data Retention Policies

- **Active Data**: Projects in ACTIVE status
- **Archived Data**: Projects older than 2 years in COMPLETED/ARCHIVED status
- **Audit Logs**: Retained for 7 years for compliance
- **Exports**: Temporary files deleted after 30 days (metadata retained)
- **Soft Deletes**: Implemented for User, Project, Batch (status = ARCHIVED)

---

## Scalability Considerations

1. **Partitioning**: 
   - `Task` table partitioned by `created_at` (monthly)
   - `StateTransition` partitioned by `created_at` (daily for high volume)
   - `AuditLog` partitioned by `timestamp` (weekly)
   - `Annotation` partitioned by `project_id`

2. **Archiving**: 
   - Completed projects older than 1 year → cold storage
   - Historical state transitions older than 90 days → archive
   - Historical audit logs → separate archive database

3. **Caching**: 
   - User profiles and permissions
   - Active project configurations
   - **XState workflow definitions** (hot cache for active workflows)
   - **Current machine states** (Redis/in-memory for fast state lookups)
   - Queue statistics

4. **Read Replicas**: 
   - Reporting and analytics queries
   - Export generation
   - Dashboard metrics
   - State transition history queries

5. **XState-Specific Optimizations**:
   - **State Machine Cache**: Cache compiled XState machines in-memory
   - **Actor Registry**: Maintain active actor references in distributed cache
   - **Event Queue**: Use message queue (Redis/RabbitMQ) for event processing
   - **Snapshot Storage**: Periodic snapshots of long-running workflow instances
   - **Context Compression**: Compress large machine contexts in storage
