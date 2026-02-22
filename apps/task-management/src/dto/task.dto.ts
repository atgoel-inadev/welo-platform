import { IsOptional, IsString, IsNumber, IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
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
  @IsArray()
  responses: Array<{
    questionId: string;
    response: any;
    timeSpent?: number;
    confidenceScore?: number;
  }>;
  
  @IsOptional()
  extraWidgetData?: any;
  
  /** Total elapsed seconds the annotator spent on this task */
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}

export class SaveReviewDto {
  @IsString()
  @IsIn(['APPROVED', 'REJECTED', 'NEEDS_REVISION', 'approved', 'rejected', 'needs_revision'])
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  
  @IsOptional()
  @IsString()
  comments?: string;
  
  @IsOptional()
  @IsNumber()
  qualityScore?: number;
  
  @IsOptional()
  extraWidgetData?: any;
  
  /** Total elapsed seconds the reviewer spent on this task */
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}

export class TimeAnalyticsQueryDto {
  projectId?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

// Stage-based workflow DTOs
export class AssignTaskToStageDto {
  userId: string;
  stageId: string;
  assignmentMethod?: 'MANUAL' | 'AUTOMATIC' | 'CLAIMED';
}

export class GetNextTaskForStageDto {
  userId: string;
  projectId: string;
  stageId: string;
}

export class IncrementReworkDto {
  stageId: string;
  reason?: string;
}
