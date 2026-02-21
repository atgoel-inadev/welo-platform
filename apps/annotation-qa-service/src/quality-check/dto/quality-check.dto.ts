import {
  IsUUID, IsEnum, IsNumber, IsOptional, IsString, IsArray,
  IsObject, Min, Max, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QualityCheckType } from '@app/common';
import { QualityRuleType, QualityRuleSeverity } from '@app/common';

export class IssueDto {
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
  @IsObject()
  location?: Record<string, any>;
}

export class CreateQualityCheckDto {
  @ApiProperty()
  @IsUUID()
  annotationId: string;

  @ApiProperty({ enum: QualityCheckType })
  @IsEnum(QualityCheckType)
  checkType: QualityCheckType;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueDto)
  issues?: IssueDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class ResolveQualityCheckDto {
  @ApiProperty({ description: 'ID of corrected annotation (optional)' })
  @IsOptional()
  @IsUUID()
  correctedAnnotationId?: string;

  @ApiProperty()
  @IsString()
  resolvedBy: string;
}

export class RunBatchAutomatedQcDto {
  @ApiPropertyOptional({ description: 'Percentage of tasks to sample (1–100)', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  samplePercentage?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checkRules?: string[];
}

export class CreateQualityRuleDto {
  @ApiProperty()
  @IsString()
  ruleName: string;

  @ApiProperty({ enum: QualityRuleType })
  @IsEnum(QualityRuleType)
  ruleType: QualityRuleType;

  @ApiProperty()
  @IsObject()
  configuration: Record<string, any>;

  @ApiPropertyOptional({ enum: QualityRuleSeverity })
  @IsOptional()
  @IsEnum(QualityRuleSeverity)
  severity?: QualityRuleSeverity;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weight?: number;
}

// Quality Gate DTOs
export class CheckQualityGateDto {
  @ApiProperty()
  @IsUUID()
  taskId: string;

  @ApiProperty()
  @IsUUID()
  annotationId: string;

  @ApiProperty()
  @IsString()
  stageId: string;
}

export class CheckConsensusQualityGateDto {
  @ApiProperty()
  @IsUUID()
  taskId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  annotationIds: string[];

  @ApiProperty()
  @IsString()
  stageId: string;
}
