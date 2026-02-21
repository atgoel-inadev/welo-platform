export class CreateTaskDto {
  batchId: string;
  projectId: string;
  workflowId: string;
  externalId: string;
  taskType: string; // ANNOTATION, REVIEW, VALIDATION
  priority?: number;
  dueDate?: Date;
  fileType?: string; // CSV, TXT, IMAGE, VIDEO, AUDIO, PDF
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMetadata?: any;
  dataPayload: {
    sourceData: any;
    references?: any[];
    context?: any;
  };
  estimatedDuration?: number;
  requiresConsensus?: boolean;
  totalAssignmentsRequired?: number;
}

export class CreateTaskBulkDto {
  tasks: CreateTaskDto[];
}

export class UpdateTaskDto {
  status?: string;
  priority?: number;
  dueDate?: Date;
  dataPayload?: any;
  estimatedDuration?: number;
  actualDuration?: number;
}

export class AssignTaskDto {
  taskId: string;
  userId: string;
  workflowStage?: string; // ANNOTATION, REVIEW, VALIDATION, CONSENSUS
  expiresIn?: number; // Seconds, default 8 hours
  assignmentMethod?: string; // MANUAL, AUTOMATIC, CLAIMED
}

export class SubmitTaskDto {
  taskId: string;
  assignmentId: string;
  annotationData: any;
  confidenceScore?: number;
  timeSpent?: number; // Seconds
  responses?: Array<{
    questionId: string;
    response: any;
    timeSpent?: number;
    confidenceScore?: number;
  }>;
}

export class UpdateTaskStatusDto {
  status: string;
  reason?: string;
  metadata?: any;
}

export class GetNextTaskDto {
  userId: string;
  queueId?: string;
  taskType?: string;
  projectId?: string;
}

export class TaskFilterDto {
  batchId?: string;
  projectId?: string;
  status?: string;
  priority?: number;
  assignedTo?: string;
  taskType?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class TaskStatisticsDto {
  taskId: string;
  totalAnnotations: number;
  completedAnnotations: number;
  averageConfidenceScore: number;
  averageTimeSpent: number;
  consensusScore?: number;
  consensusReached: boolean;
  currentReviewLevel: number;
  reviewsApproved: number;
  reviewsRejected: number;
  qualityScore?: number;
}

export class BulkTaskActionDto {
  taskIds: string[];
  action: 'ASSIGN' | 'SKIP' | 'RESET' | 'ARCHIVE' | 'HOLD' | 'PRIORITY_CHANGE';
  userId?: string; // For ASSIGN action
  priority?: number; // For PRIORITY_CHANGE action
  reason?: string;
}

export class TaskTransitionDto {
  event: string;
  payload?: any;
}

export class SaveAnnotationDto {
  responses: Array<{
    questionId: string;
    response: any;
    timeSpent?: number;
    confidenceScore?: number;
  }>;
  extraWidgetData?: any;
}

export class SaveReviewDto {
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  comments?: string;
  qualityScore?: number;
  extraWidgetData?: any;
}
