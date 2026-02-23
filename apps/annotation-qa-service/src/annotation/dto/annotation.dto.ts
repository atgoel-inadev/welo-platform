import { IsUUID, IsObject, IsNumber, IsOptional, IsBoolean, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SubmitAnnotationDto {
  @ApiProperty({ description: 'Assignment ID for this annotation', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  assignmentId: string;

  @ApiProperty({
    description: 'Annotation data payload (labels, spans, entities, attributes)',
    example: {
      labels: [{ id: 'lbl-1', name: 'PERSON', value: 'John Doe' }],
      spans: [{ start: 0, end: 8, label: 'PERSON', text: 'John Doe' }],
      entities: [{ id: 'ent-1', type: 'PERSON', text: 'John Doe', start: 0, end: 8 }],
      relationships: [],
      attributes: { sentiment: 'positive', confidence: 'high' },
      freeText: 'This sentence refers to a person named John Doe.',
    },
  })
  @IsObject()
  annotationData: {
    labels?: any[];
    spans?: any[];
    entities?: any[];
    relationships?: any[];
    attributes?: Record<string, any>;
    freeText?: string;
  };

  @ApiPropertyOptional({ description: 'Annotator confidence score (0.0 - 1.0)', minimum: 0, maximum: 1, example: 0.92 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @ApiPropertyOptional({ description: 'Time spent on annotation in seconds', example: 145 })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Save as draft (no QC triggered)', default: false, example: false })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @ApiPropertyOptional({ description: 'Annotation tool version', example: '2.1.0' })
  @IsOptional()
  @IsString()
  toolVersion?: string;
}

export class UpdateAnnotationDto {
  @ApiPropertyOptional({ description: 'Updated annotation data', example: { labels: [{ id: 'lbl-1', name: 'ORG', value: 'Acme Corp' }], attributes: { sentiment: 'neutral' } } })
  @IsOptional()
  @IsObject()
  annotationData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Updated confidence score', example: 0.88, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @ApiPropertyOptional({ description: 'Reason for the change', example: 'Corrected entity type from PERSON to ORG' })
  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class CompareAnnotationsDto {
  @ApiProperty({ type: [String], description: 'Array of annotation IDs to compare', example: ['a1b2c3d4-0001-0000-0000-000000000001', 'a1b2c3d4-0001-0000-0000-000000000002'] })
  @IsUUID('4', { each: true })
  annotationIds: string[];
}
