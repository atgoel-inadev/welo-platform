import { IsUUID, IsObject, IsNumber, IsOptional, IsBoolean, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SubmitAnnotationDto {
  @ApiProperty({ description: 'Assignment ID for this annotation' })
  @IsUUID()
  assignmentId: string;

  @ApiProperty({ description: 'Annotation data payload (labels, spans, entities, attributes)' })
  @IsObject()
  annotationData: {
    labels?: any[];
    spans?: any[];
    entities?: any[];
    relationships?: any[];
    attributes?: Record<string, any>;
    freeText?: string;
  };

  @ApiPropertyOptional({ description: 'Annotator confidence score (0.0 - 1.0)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @ApiPropertyOptional({ description: 'Time spent on annotation in seconds' })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Save as draft (no QC triggered)', default: false })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @ApiPropertyOptional({ description: 'Annotation tool version' })
  @IsOptional()
  @IsString()
  toolVersion?: string;
}

export class UpdateAnnotationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  annotationData?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class CompareAnnotationsDto {
  @ApiProperty({ type: [String], description: 'Array of annotation IDs to compare' })
  @IsUUID('4', { each: true })
  annotationIds: string[];
}
