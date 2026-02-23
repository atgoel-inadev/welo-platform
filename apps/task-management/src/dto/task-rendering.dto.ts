import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsObject, IsEnum, IsOptional, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for annotation response
 */
export class AnnotationResponseDto {
  @ApiProperty({ description: 'Question ID', example: 'q-sentiment-001' })
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Response value (can be any type)', example: 'positive' })
  response: any;
}

/**
 * DTO for saving annotation
 */
export class SaveAnnotationDto {
  @ApiProperty({
    description: 'Annotation responses (answers to annotation questions)',
    type: [AnnotationResponseDto],
    example: [
      { questionId: 'q-sentiment-001', response: 'positive' },
      { questionId: 'q-category-002', response: ['tech', 'finance'] },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnotationResponseDto)
  responses: AnnotationResponseDto[];

  @ApiPropertyOptional({
    description: 'Data from extra configured widgets (optional)',
    example: { highlightedSpans: [{ start: 0, end: 15, label: 'ENTITY' }] },
  })
  @IsOptional()
  @IsObject()
  extraWidgetData?: Record<string, any>;
}

/**
 * DTO for review decision
 */
export class SaveReviewDto {
  @ApiProperty({
    description: 'Review decision',
    enum: ['approved', 'rejected', 'needs_revision'],
    example: 'approved',
  })
  @IsEnum(['approved', 'rejected', 'needs_revision'])
  decision: 'approved' | 'rejected' | 'needs_revision';

  @ApiPropertyOptional({ description: 'Review comments', example: 'Annotation looks accurate. Minor spacing issue in span 3.' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({
    description: 'Quality score (0-100)',
    minimum: 0,
    maximum: 100,
    example: 92,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @ApiPropertyOptional({
    description: 'Data from extra configured widgets in reviewer view',
    example: { correctedSpans: [{ start: 5, end: 12, label: 'PERSON' }] },
  })
  @IsOptional()
  @IsObject()
  extraWidgetData?: Record<string, any>;
}

/**
 * Response DTO for task render configuration
 */
export class TaskRenderConfigResponseDto {
  @ApiProperty({ description: 'Task ID', example: '650e8400-e29b-41d4-a716-446655440021' })
  taskId: string;

  @ApiProperty({ description: 'Project ID', example: '550e8400-e29b-41d4-a716-446655440005' })
  projectId: string;

  @ApiProperty({
    description: 'View type',
    enum: ['annotator', 'reviewer'],
    example: 'annotator',
  })
  viewType: 'annotator' | 'reviewer';

  @ApiProperty({
    description: 'Task data',
    example: {
      id: '650e8400-e29b-41d4-a716-446655440021',
      name: 'Classify email #127',
      description: 'Classify the sentiment of this email thread',
      fileUrls: ['https://storage.example.com/files/email-127.txt'],
      metadata: { source: 'email', threadLength: 5 },
      currentReviewLevel: 1,
      status: 'assigned',
    },
  })
  taskData: {
    id: string;
    name: string;
    description: string;
    fileUrls: string[];
    metadata: Record<string, any>;
    currentReviewLevel: number;
    status: string;
  };

  @ApiProperty({ description: 'UI configuration for the view', example: { layout: 'split', panels: ['text-viewer', 'question-form'] } })
  uiConfiguration: any;

  @ApiProperty({
    description: 'Annotation questions from project',
    example: [{ id: 'q-sentiment-001', type: 'single-select', label: 'Sentiment', options: ['positive', 'negative', 'neutral'] }],
  })
  annotationQuestions: any[];

  @ApiPropertyOptional({
    description: 'Previous annotations (for reviewer view)',
    example: [{ questionId: 'q-sentiment-001', response: 'positive', annotatorId: 'user-001' }],
  })
  previousAnnotations: any[] | null;

  @ApiProperty({ description: 'Annotation responses stored in task', example: [{ questionId: 'q-sentiment-001', response: 'positive' }] })
  annotationResponses: any[];

  @ApiProperty({ description: 'Extra widget data', example: {} })
  extraWidgetData: Record<string, any>;

  @ApiProperty({ description: 'Review data', example: [] })
  reviewData: any[];
}

/**
 * Response DTO for annotation history
 */
export class TaskAnnotationHistoryResponseDto {
  @ApiProperty({ description: 'Task ID', example: '650e8400-e29b-41d4-a716-446655440021' })
  taskId: string;

  @ApiProperty({ description: 'Annotation responses', example: [{ questionId: 'q-sentiment-001', response: 'positive' }] })
  annotationResponses: any[];

  @ApiProperty({ description: 'Extra widget data', example: {} })
  extraWidgetData: Record<string, any>;

  @ApiProperty({ description: 'Review data', example: [{ decision: 'approved', score: 92, reviewer: 'user-005' }] })
  reviewData: any[];

  @ApiProperty({
    description: 'Full annotation records',
    example: [
      {
        id: 'ann-001',
        annotatorId: 'user-001',
        responses: [{ questionId: 'q-sentiment-001', response: 'positive' }],
        submittedAt: '2025-02-15T10:30:00.000Z',
      },
    ],
  })
  annotations: any[];
}
