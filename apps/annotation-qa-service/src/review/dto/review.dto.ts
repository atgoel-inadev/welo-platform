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
  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  severity: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  location?: Record<string, any>;
}

export class SubmitReviewDto {
  @ApiProperty({ description: 'The annotation being reviewed' })
  @IsUUID()
  annotationId: string;

  @ApiProperty({ description: 'Reviewer quality score (0–100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ enum: ReviewDecision })
  @IsEnum(ReviewDecision)
  decision: ReviewDecision;

  @ApiPropertyOptional({ description: 'Reviewer feedback text' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ description: 'Specific issues identified', type: [ReviewIssueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewIssueDto)
  issues?: ReviewIssueDto[];

  @ApiPropertyOptional({ description: 'Time spent reviewing in seconds' })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}
