export const KAFKA_TOPICS = {
  // Task Management
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',
  TASK_SUBMITTED: 'task.submitted',
  TASK_STATE_CHANGED: 'task.state_changed',
  TASK_EXPIRED: 'task.expired',

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
  AUTO_QC_PASSED: 'auto_qc.passed',
  AUTO_QC_FAILED: 'auto_qc.failed',

  // Assignment
  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_EXPIRED: 'assignment.expired',

  // Workflow
  STATE_TRANSITIONED: 'state.transitioned',

  // File Storage
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

  // Review
  REVIEW_SUBMITTED: 'review.submitted',
  TASK_APPROVED: 'task.approved',
  TASK_REJECTED_TO_QUEUE: 'task.rejected_to_queue',
  TASK_ESCALATED: 'task.escalated',

  // Gold / QC
  GOLD_COMPARISON_COMPLETED: 'gold_comparison.completed',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
