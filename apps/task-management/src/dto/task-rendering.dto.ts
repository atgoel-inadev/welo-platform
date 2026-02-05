import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsObject, IsEnum, IsOptional, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for annotation response
 */
export class AnnotationResponseDto {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Response value (can be any type)' })
  response: any;
}

/**
 * DTO for saving annotation
 */
export class SaveAnnotationDto {
  @ApiProperty({
    description: 'Annotation responses (answers to annotation questions)',
    type: [AnnotationResponseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnotationResponseDto)
  responses: AnnotationResponseDto[];

  @ApiPropertyOptional({
    description: 'Data from extra configured widgets (optional)',
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
  })
  @IsEnum(['approved', 'rejected', 'needs_revision'])
  decision: 'approved' | 'rejected' | 'needs_revision';

  @ApiPropertyOptional({ description: 'Review comments' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({
    description: 'Quality score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @ApiPropertyOptional({
    description: 'Data from extra configured widgets in reviewer view',
  })
  @IsOptional()
  @IsObject()
  extraWidgetData?: Record<string, any>;
}

/**
 * Response DTO for task render configuration
 */
export class TaskRenderConfigResponseDto {
  @ApiProperty({ description: 'Task ID' })
  taskId: string;

  @ApiProperty({ description: 'Project ID' })
  projectId: string;

  @ApiProperty({
    description: 'View type',
    enum: ['annotator', 'reviewer'],
  })
  viewType: 'annotator' | 'reviewer';

  @ApiProperty({ description: 'Task data' })
  taskData: {
    id: string;
    name: string;
    description: string;
    fileUrls: string[];
    metadata: Record<string, any>;
    currentReviewLevel: number;
    status: string;
  };

  @ApiProperty({ description: 'UI configuration for the view' })
  uiConfiguration: any;

  @ApiProperty({ description: 'Annotation questions from project' })
  annotationQuestions: any[];

  @ApiPropertyOptional({
    description: 'Previous annotations (for reviewer view)',
  })
  previousAnnotations: any[] | null;

  @ApiProperty({ description: 'Annotation responses stored in task' })
  annotationResponses: any[];

  @ApiProperty({ description: 'Extra widget data' })
  extraWidgetData: Record<string, any>;

  @ApiProperty({ description: 'Review data' })
  reviewData: any[];
}

/**
 * Response DTO for annotation history
 */
export class TaskAnnotationHistoryResponseDto {
  @ApiProperty({ description: 'Task ID' })
  taskId: string;

  @ApiProperty({ description: 'Annotation responses' })
  annotationResponses: any[];

  @ApiProperty({ description: 'Extra widget data' })
  extraWidgetData: Record<string, any>;

  @ApiProperty({ description: 'Review data' })
  reviewData: any[];

  @ApiProperty({ description: 'Full annotation records' })
  annotations: any[];
}
