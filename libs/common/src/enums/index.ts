// Project Types
export enum ProjectType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  MULTIMODAL = 'MULTIMODAL',
}

// Project Status
export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

// Customer Status
export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// Batch Status
export enum BatchStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  EXPORTED = 'EXPORTED',
}

// Task Type
export enum TaskType {
  ANNOTATION = 'ANNOTATION',
  REVIEW = 'REVIEW',
  VALIDATION = 'VALIDATION',
  CONSENSUS = 'CONSENSUS',
}

// Task Status
export enum TaskStatus {
  QUEUED = 'QUEUED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SKIPPED = 'SKIPPED',
}

// Assignment Status
export enum AssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  REASSIGNED = 'REASSIGNED',
}

// Assignment Method
export enum AssignmentMethod {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
  CLAIMED = 'CLAIMED',
}

// Workflow Stage
export enum WorkflowStage {
  ANNOTATION = 'ANNOTATION',
  REVIEW = 'REVIEW',
  VALIDATION = 'VALIDATION',
  CONSENSUS = 'CONSENSUS',
}

// User Role
export enum UserRole {
  ANNOTATOR = 'ANNOTATOR',
  REVIEWER = 'REVIEWER',
  QA = 'QA',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

// User Status
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// Skill Proficiency
export enum SkillProficiency {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

// Queue Type
export enum QueueType {
  ANNOTATION = 'ANNOTATION',
  REVIEW = 'REVIEW',
  VALIDATION = 'VALIDATION',
  CONSENSUS = 'CONSENSUS',
}

// Queue Status
export enum QueueStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

// Workflow Status
export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED',
}

// XState State Type
export enum StateType {
  ATOMIC = 'atomic',
  COMPOUND = 'compound',
  PARALLEL = 'parallel',
  FINAL = 'final',
  HISTORY = 'history',
}

// Export Type
export enum ExportType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  FILTERED = 'FILTERED',
}

// Export Format
export enum ExportFormat {
  JSON = 'JSON',
  JSONL = 'JSONL',
  CSV = 'CSV',
  COCO = 'COCO',
  PASCAL_VOC = 'PASCAL_VOC',
  CUSTOM = 'CUSTOM',
}

// Export Status
export enum ExportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// Audit Action
export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ASSIGN = 'ASSIGN',
  SUBMIT = 'SUBMIT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  EXPORT = 'EXPORT',
}

// Notification Type
export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_EXPIRED = 'TASK_EXPIRED',
  FEEDBACK_RECEIVED = 'FEEDBACK_RECEIVED',
  BATCH_COMPLETED = 'BATCH_COMPLETED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

// Priority
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// Quality Check Type
export enum QualityCheckType {
  AUTOMATED = 'AUTOMATED',
  MANUAL = 'MANUAL',
  CONSENSUS = 'CONSENSUS',
  GOLD_STANDARD = 'GOLD_STANDARD',
}

// Quality Check Status
export enum QualityCheckStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  NEEDS_REVISION = 'NEEDS_REVISION',
  DISPUTED = 'DISPUTED',
}

// Issue Severity
export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Comment Entity Type
export enum CommentEntityType {
  TASK = 'TASK',
  ANNOTATION = 'ANNOTATION',
  QUALITY_CHECK = 'QUALITY_CHECK',
  BATCH = 'BATCH',
}

// Template Type
export enum TemplateType {
  ANNOTATION_SCHEMA = 'ANNOTATION_SCHEMA',
  UI_CONFIG = 'UI_CONFIG',
  QUALITY_RULES = 'QUALITY_RULES',
  WORKFLOW = 'WORKFLOW',
}

// State Transition Entity Type
export enum StateTransitionEntityType {
  TASK = 'TASK',
  BATCH = 'BATCH',
  ASSIGNMENT = 'ASSIGNMENT',
  WORKFLOW_INSTANCE = 'WORKFLOW_INSTANCE',
}

// Transition Type
export enum TransitionType {
  EXTERNAL = 'EXTERNAL',
  INTERNAL = 'INTERNAL',
  DELAYED = 'DELAYED',
  GUARDED = 'GUARDED',
  ALWAYS = 'ALWAYS',
}

// Event Trigger
export enum EventTrigger {
  USER_ACTION = 'USER_ACTION',
  SYSTEM = 'SYSTEM',
  TIMER = 'TIMER',
  WEBHOOK = 'WEBHOOK',
  SERVICE = 'SERVICE',
}

// Workflow Instance Status
export enum WorkflowInstanceStatus {
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  STOPPED = 'STOPPED',
}

// Actor Type
export enum ActorType {
  ROOT = 'ROOT',
  CHILD = 'CHILD',
  INVOKED = 'INVOKED',
}

// Action Type
export enum ActionType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  TRANSITION = 'TRANSITION',
  ASSIGN = 'ASSIGN',
}
