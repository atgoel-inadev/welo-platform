import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { WorkflowStatus } from '@app/common';

export class CreateWorkflowDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ description: 'XState machine definition' })
  @IsObject()
  xstateDefinition: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  stateSchema?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  eventSchema?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  visualizationConfig?: any;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentWorkflowId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  xstateDefinition?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  stateSchema?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  eventSchema?: any[];

  @ApiPropertyOptional({ enum: WorkflowStatus })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  visualizationConfig?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class SimulateWorkflowDto {
  @ApiProperty()
  @IsObject()
  initialContext: any;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  events: Array<{ type: string; payload?: any }>;
}

export class WorkflowValidationResultDto {
  @ApiProperty()
  isValid: boolean;

  @ApiProperty({ type: 'array', items: { type: 'string' } })
  errors: string[];

  @ApiProperty({ type: 'array', items: { type: 'string' } })
  warnings: string[];

  @ApiPropertyOptional()
  visualizationUrl?: string;
}
