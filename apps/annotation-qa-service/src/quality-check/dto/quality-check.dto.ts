import {
  IsUUID, IsEnum, IsNumber, IsOptional, IsString, IsArray,
  IsObject, Min, Max, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QualityCheckType } from '@app/common';
import { QualityRuleType, QualityRuleSeverity } from '@app/common';

export class IssueDto {
  @ApiProperty({ example: 'LABELING', description: 'Issue category' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'MAJOR', description: 'Issue severity (MINOR, MAJOR, CRITICAL)' })
  @IsString()
  severity: string;

  @ApiProperty({ example: 'Missing entity annotation for "Google" at position 45', description: 'Issue description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: { line: 3, charStart: 45, charEnd: 51 }, description: 'Location in the annotated content' })
  @IsOptional()
  @IsObject()
  location?: Record<string, any>;
}

export class CreateQualityCheckDto {
  @ApiProperty({ example: 'a1b2c3d4-0001-0000-0000-000000000001', description: 'Annotation ID to check' })
  @IsUUID()
  annotationId: string;

  @ApiProperty({ enum: QualityCheckType, example: 'MANUAL', description: 'Type of quality check' })
  @IsEnum(QualityCheckType)
  checkType: QualityCheckType;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, example: 78, description: 'Quality score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @ApiPropertyOptional({
    description: 'Issues found during quality check',
    type: [IssueDto],
    example: [{ category: 'LABELING', severity: 'MINOR', description: 'Incorrect entity type' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueDto)
  issues?: IssueDto[];

  @ApiPropertyOptional({ example: 'Annotation needs better boundary precision', description: 'Quality feedback' })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class ResolveQualityCheckDto {
  @ApiPropertyOptional({ description: 'ID of corrected annotation (optional)', example: 'a1b2c3d4-0001-0000-0000-000000000099' })
  @IsOptional()
  @IsUUID()
  correctedAnnotationId?: string;

  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440005', description: 'User ID resolving the check' })
  @IsString()
  resolvedBy: string;
}

export class RunBatchAutomatedQcDto {
  @ApiPropertyOptional({ description: 'Percentage of tasks to sample (1–100)', default: 100, example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  samplePercentage?: number;

  @ApiPropertyOptional({ type: [String], example: ['COMPLETENESS', 'CONSISTENCY', 'BOUNDARY_PRECISION'], description: 'QC rules to apply' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checkRules?: string[];
}

export class CreateQualityRuleDto {
  @ApiProperty({ example: 'Minimum Entity Count', description: 'Rule display name' })
  @IsString()
  ruleName: string;

  @ApiProperty({ enum: QualityRuleType, example: 'COMPLETENESS', description: 'Rule type' })
  @IsEnum(QualityRuleType)
  ruleType: QualityRuleType;

  @ApiProperty({ example: { minimumEntities: 3, requiredLabels: ['PERSON', 'ORG'] }, description: 'Rule configuration' })
  @IsObject()
  configuration: Record<string, any>;

  @ApiPropertyOptional({ enum: QualityRuleSeverity, example: 'WARNING', description: 'Severity if rule fails' })
  @IsOptional()
  @IsEnum(QualityRuleSeverity)
  severity?: QualityRuleSeverity;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 1.0, example: 0.8, description: 'Weight of this rule in overall score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weight?: number;
}

// Quality Gate DTOs
export class CheckQualityGateDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440021', description: 'Task ID' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ example: 'a1b2c3d4-0001-0000-0000-000000000001', description: 'Annotation ID to validate' })
  @IsUUID()
  annotationId: string;

  @ApiProperty({ example: 'stage-annotation-1', description: 'Workflow stage ID' })
  @IsString()
  stageId: string;
}

export class CheckConsensusQualityGateDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440021', description: 'Task ID' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ type: [String], example: ['ann-001', 'ann-002', 'ann-003'], description: 'Annotation IDs from multiple annotators' })
  @IsArray()
  @IsUUID('4', { each: true })
  annotationIds: string[];

  @ApiProperty({ example: 'stage-annotation-1', description: 'Workflow stage ID' })
  @IsString()
  stageId: string;
}
