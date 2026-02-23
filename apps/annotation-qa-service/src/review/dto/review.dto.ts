import {
  IsUUID, IsEnum, IsNumber, IsOptional, IsString, IsArray,
  ValidateNested, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_REVISION = 'REQUEST_REVISION',
}

export class ReviewIssueDto {
  @ApiProperty({ example: 'LABELING', description: 'Issue category (LABELING, BOUNDARY, MISSING, EXTRA)' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'MAJOR', description: 'Issue severity (MINOR, MAJOR, CRITICAL)' })
  @IsString()
  severity: string;

  @ApiProperty({ example: 'Entity "John" was labeled as ORG but should be PERSON', description: 'Issue description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: { spanStart: 0, spanEnd: 4, field: 'entities[0]' }, description: 'Location of the issue in the annotation' })
  @IsOptional()
  location?: Record<string, any>;
}

export class SubmitReviewDto {
  @ApiProperty({ description: 'The annotation being reviewed', example: 'a1b2c3d4-0001-0000-0000-000000000001' })
  @IsUUID()
  annotationId: string;

  @ApiProperty({ description: 'Reviewer quality score (0–100)', minimum: 0, maximum: 100, example: 85 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ enum: ReviewDecision, example: 'APPROVE', description: 'Review decision' })
  @IsEnum(ReviewDecision)
  decision: ReviewDecision;

  @ApiPropertyOptional({ description: 'Reviewer feedback text', example: 'Good annotation quality, minor boundary issue on entity #3' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({
    description: 'Specific issues identified',
    type: [ReviewIssueDto],
    example: [{ category: 'BOUNDARY', severity: 'MINOR', description: 'Span boundary off by 1 character', location: { spanStart: 10, spanEnd: 15 } }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewIssueDto)
  issues?: ReviewIssueDto[];

  @ApiPropertyOptional({ description: 'Time spent reviewing in seconds', example: 90 })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}
