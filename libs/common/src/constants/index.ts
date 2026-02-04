export const SERVICES = {
  AUTH_SERVICE: 'AUTH_SERVICE',
  TASK_MANAGEMENT: 'TASK_MANAGEMENT',
  WORKFLOW_ENGINE: 'WORKFLOW_ENGINE',
  ANNOTATION_SERVICE: 'ANNOTATION_SERVICE',
  QUALITY_ASSURANCE: 'QUALITY_ASSURANCE',
} as const;

export const EVENTS = {
  // Task events
  TASK_CREATED: 'task.created',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',
  TASK_UPDATED: 'task.updated',
  
  // Workflow events
  STATE_TRANSITIONED: 'state.transitioned',
  WORKFLOW_INSTANCE_STARTED: 'workflow.instance.started',
  WORKFLOW_INSTANCE_COMPLETED: 'workflow.instance.completed',
  WORKFLOW_INSTANCE_FAILED: 'workflow.instance.failed',
  
  // Annotation events
  ANNOTATION_SUBMITTED: 'annotation.submitted',
  ANNOTATION_UPDATED: 'annotation.updated',
  
  // Quality events
  QUALITY_CHECK_COMPLETED: 'quality_check.completed',
  QUALITY_CHECK_PASSED: 'quality_check.passed',
  QUALITY_CHECK_FAILED: 'quality_check.failed',
} as const;

export const KAFKA_TOPICS = {
  TASK_EVENTS: 'task-events',
  WORKFLOW_EVENTS: 'workflow-events',
  ANNOTATION_EVENTS: 'annotation-events',
  QUALITY_EVENTS: 'quality-events',
} as const;

export const CACHE_KEYS = {
  WORKFLOW_DEFINITION: (id: string) => `workflow:definition:${id}`,
  COMPILED_MACHINE: (id: string) => `workflow:machine:${id}`,
  TASK_STATE: (id: string) => `task:state:${id}`,
  ACTOR_REGISTRY: (id: string) => `actor:registry:${id}`,
} as const;

export const ERROR_CODES = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Workflow errors
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  WORKFLOW_VALIDATION_FAILED: 'WORKFLOW_VALIDATION_FAILED',
  MACHINE_NOT_FOUND: 'MACHINE_NOT_FOUND',
  
  // System errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
