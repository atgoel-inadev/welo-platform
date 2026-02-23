import { IsOptional, IsString, IsNumber, IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: '750e8400-e29b-41d4-a716-446655440001', description: 'Batch ID' })
  batchId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440005', description: 'Project ID' })
  projectId: string;

  @ApiProperty({ example: 'wf-001', description: 'Workflow ID' })
  workflowId: string;

  @ApiProperty({ example: 'file-001', description: 'External file/record identifier' })
  externalId: string;

  @ApiProperty({ example: 'ANNOTATION', description: 'Task type: ANNOTATION, REVIEW, VALIDATION' })
  taskType: string;

  @ApiPropertyOptional({ example: 5, description: 'Priority (1=lowest, 10=highest)' })
  priority?: number;

  @ApiPropertyOptional({ example: '2025-04-30', description: 'Task due date' })
  dueDate?: Date;

  @ApiPropertyOptional({ example: 'CSV', description: 'File type: CSV, TXT, IMAGE, VIDEO, AUDIO, PDF' })
  fileType?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/files/data.csv', description: 'URL of the file' })
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'data.csv', description: 'File name' })
  fileName?: string;

  @ApiPropertyOptional({ example: 2048, description: 'File size in bytes' })
  fileSize?: number;

  @ApiPropertyOptional({ description: 'Additional file metadata' })
  fileMetadata?: any;

  @ApiProperty({
    description: 'Task data payload',
    example: { sourceData: { text: 'Sample text to annotate' }, references: [], context: {} },
  })
  dataPayload: {
    sourceData: any;
    references?: any[];
    context?: any;
  };

  @ApiPropertyOptional({ example: 300, description: 'Estimated duration in seconds' })
  estimatedDuration?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether consensus from multiple annotators is required' })
  requiresConsensus?: boolean;

  @ApiPropertyOptional({ example: 3, description: 'Total assignments needed (for consensus)' })
  totalAssignmentsRequired?: number;
}

export class CreateTaskBulkDto {
  @ApiProperty({ type: [CreateTaskDto], description: 'Array of tasks to create' })
  tasks: CreateTaskDto[];
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'IN_PROGRESS', description: 'Task status' })
  status?: string;

  @ApiPropertyOptional({ example: 7, description: 'Updated priority' })
  priority?: number;

  @ApiPropertyOptional({ example: '2025-05-15', description: 'Updated due date' })
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Updated data payload' })
  dataPayload?: any;

  @ApiPropertyOptional({ example: 300, description: 'Estimated duration in seconds' })
  estimatedDuration?: number;

  @ApiPropertyOptional({ example: 180, description: 'Actual duration in seconds' })
  actualDuration?: number;
}

export class AssignTaskDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440021', description: 'Task ID to assign' })
  taskId: string;

  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440010', description: 'User ID to assign to' })
  userId: string;

  @ApiPropertyOptional({ example: 'ANNOTATION', description: 'Workflow stage: ANNOTATION, REVIEW, VALIDATION, CONSENSUS' })
  workflowStage?: string;

  @ApiPropertyOptional({ example: 28800, description: 'Expiration in seconds (default 8 hours)' })
  expiresIn?: number;

  @ApiPropertyOptional({ example: 'MANUAL', description: 'Assignment method: MANUAL, AUTOMATIC, CLAIMED' })
  assignmentMethod?: string;
}

export class SubmitTaskDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440021', description: 'Task ID' })
  taskId: string;

  @ApiProperty({ example: 'assign-001', description: 'Assignment ID' })
  assignmentId: string;

  @ApiProperty({ description: 'Annotation data payload', example: { label: 'positive', confidence: 0.95 } })
  annotationData: any;

  @ApiPropertyOptional({ example: 0.95, description: 'Annotator confidence score (0-1)' })
  confidenceScore?: number;

  @ApiPropertyOptional({ example: 120, description: 'Time spent in seconds' })
  timeSpent?: number;

  @ApiPropertyOptional({
    description: 'Per-question responses',
    example: [{ questionId: 'q1', response: 'positive', timeSpent: 30, confidenceScore: 0.9 }],
  })
  responses?: Array<{
    questionId: string;
    response: any;
    timeSpent?: number;
    confidenceScore?: number;
  }>;
}

export class UpdateTaskStatusDto {
  @ApiProperty({ example: 'COMPLETED', description: 'New task status' })
  status: string;

  @ApiPropertyOptional({ example: 'Quality check passed', description: 'Reason for status change' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;
}

export class GetNextTaskDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440010', description: 'User ID requesting next task' })
  userId: string;

  @ApiPropertyOptional({ example: 'queue-1', description: 'Queue ID' })
  queueId?: string;

  @ApiPropertyOptional({ example: 'ANNOTATION', description: 'Task type filter' })
  taskType?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440005', description: 'Project ID filter' })
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
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440021' })
  taskId: string;

  @ApiProperty({ example: 3 })
  totalAnnotations: number;

  @ApiProperty({ example: 2 })
  completedAnnotations: number;

  @ApiProperty({ example: 0.87 })
  averageConfidenceScore: number;

  @ApiProperty({ example: 145, description: 'Average time spent in seconds' })
  averageTimeSpent: number;

  @ApiPropertyOptional({ example: 0.92 })
  consensusScore?: number;

  @ApiProperty({ example: true })
  consensusReached: boolean;

  @ApiProperty({ example: 1 })
  currentReviewLevel: number;

  @ApiProperty({ example: 1 })
  reviewsApproved: number;

  @ApiProperty({ example: 0 })
  reviewsRejected: number;

  @ApiPropertyOptional({ example: 0.95 })
  qualityScore?: number;
}

export class BulkTaskActionDto {
  @ApiProperty({ type: [String], example: ['task-1', 'task-2', 'task-3'], description: 'Task IDs to act on' })
  taskIds: string[];

  @ApiProperty({
    enum: ['ASSIGN', 'SKIP', 'RESET', 'ARCHIVE', 'HOLD', 'PRIORITY_CHANGE'],
    example: 'ASSIGN',
    description: 'Bulk action to perform',
  })
  action: 'ASSIGN' | 'SKIP' | 'RESET' | 'ARCHIVE' | 'HOLD' | 'PRIORITY_CHANGE';

  @ApiPropertyOptional({ example: 'user-001', description: 'User ID (for ASSIGN action)' })
  userId?: string;

  @ApiPropertyOptional({ example: 8, description: 'Priority (for PRIORITY_CHANGE action)' })
  priority?: number;

  @ApiPropertyOptional({ example: 'Moving to high priority queue', description: 'Reason for action' })
  reason?: string;
}

export class TaskTransitionDto {
  @ApiProperty({ example: 'SUBMIT', description: 'Workflow event name' })
  event: string;

  @ApiPropertyOptional({ description: 'Event payload data' })
  payload?: any;
}

export class SaveAnnotationDto {
  @ApiProperty({
    description: 'Array of question responses',
    example: [{ questionId: 'q1', response: 'positive', timeSpent: 30, confidenceScore: 0.9 }],
  })
  @IsArray()
  responses: Array<{
    questionId: string;
    response: any;
    timeSpent?: number;
    confidenceScore?: number;
  }>;
  
  @ApiPropertyOptional({ description: 'Extra widget data from the UI builder' })
  @IsOptional()
  extraWidgetData?: any;
  
  @ApiPropertyOptional({ example: 120, description: 'Total elapsed seconds the annotator spent on this task' })
  /** Total elapsed seconds the annotator spent on this task */
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}

export class SaveReviewDto {
  @ApiProperty({
    enum: ['APPROVED', 'REJECTED', 'NEEDS_REVISION', 'approved', 'rejected', 'needs_revision'],
    example: 'APPROVED',
    description: 'Review decision',
  })
  @IsString()
  @IsIn(['APPROVED', 'REJECTED', 'NEEDS_REVISION', 'approved', 'rejected', 'needs_revision'])
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  
  @ApiPropertyOptional({ example: 'Good quality annotation', description: 'Review comments' })
  @IsOptional()
  @IsString()
  comments?: string;
  
  @ApiPropertyOptional({ example: 0.92, description: 'Quality score (0-1)' })
  @IsOptional()
  @IsNumber()
  qualityScore?: number;
  
  @ApiPropertyOptional({ description: 'Extra widget data from the UI builder' })
  @IsOptional()
  extraWidgetData?: any;
  
  @ApiPropertyOptional({ example: 90, description: 'Total elapsed seconds the reviewer spent on this task' })
  /** Total elapsed seconds the reviewer spent on this task */
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}

export class TimeAnalyticsQueryDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440005', description: 'Filter by project' })
  projectId?: string;

  @ApiPropertyOptional({ example: '750e8400-e29b-41d4-a716-446655440001', description: 'Filter by batch' })
  batchId?: string;

  @ApiPropertyOptional({ example: '2025-01-01', description: 'Start date filter' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'End date filter' })
  endDate?: string;

  @ApiPropertyOptional({ example: '650e8400-e29b-41d4-a716-446655440010', description: 'Filter by user' })
  userId?: string;
}

// Stage-based workflow DTOs
export class AssignTaskToStageDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440010', description: 'User ID to assign' })
  userId: string;

  @ApiProperty({ example: 'stage-annotation-1', description: 'Workflow stage ID' })
  stageId: string;

  @ApiPropertyOptional({ enum: ['MANUAL', 'AUTOMATIC', 'CLAIMED'], example: 'MANUAL' })
  assignmentMethod?: 'MANUAL' | 'AUTOMATIC' | 'CLAIMED';
}

export class GetNextTaskForStageDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440010', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440005', description: 'Project ID' })
  projectId: string;

  @ApiProperty({ example: 'stage-annotation-1', description: 'Stage ID' })
  stageId: string;
}

export class IncrementReworkDto {
  @ApiProperty({ example: 'stage-annotation-1', description: 'Stage ID for rework' })
  stageId: string;

  @ApiPropertyOptional({ example: 'Quality below threshold', description: 'Reason for rework' })
  reason?: string;
}
