import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { WorkflowStatus } from '@app/common';

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Standard Annotation Pipeline', description: 'Workflow name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '3-stage annotation with review and QA', description: 'Workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440005', description: 'Project ID to bind workflow to' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'XState machine definition',
    example: {
      id: 'annotationWorkflow',
      initial: 'queued',
      states: {
        queued: { on: { ASSIGN: 'assigned' } },
        assigned: { on: { SUBMIT: 'in_review' } },
        in_review: { on: { APPROVE: 'completed', REJECT: 'assigned' } },
        completed: { type: 'final' },
      },
    },
  })
  @IsObject()
  xstateDefinition: any;

  @ApiPropertyOptional({
    description: 'State schema describing valid states',
    example: { states: ['queued', 'assigned', 'in_review', 'completed'] },
  })
  @IsOptional()
  @IsObject()
  stateSchema?: any;

  @ApiPropertyOptional({
    description: 'Event schema describing valid events',
    example: [{ type: 'ASSIGN', payload: { userId: 'string' } }, { type: 'SUBMIT' }, { type: 'APPROVE' }, { type: 'REJECT' }],
  })
  @IsOptional()
  @IsArray()
  eventSchema?: any[];

  @ApiPropertyOptional({ description: 'Visualization configuration for graph rendering', example: { layout: 'dagre', direction: 'TB' } })
  @IsOptional()
  @IsObject()
  visualizationConfig?: any;

  @ApiPropertyOptional({ default: false, example: false, description: 'Whether this is a reusable template' })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ example: 'wf-parent-001', description: 'Parent workflow ID (for versioning)' })
  @IsOptional()
  @IsString()
  parentWorkflowId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { version: '1.0', author: 'admin' } })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ example: 'Updated Workflow Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated workflow with 4 stages' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Updated XState machine definition', example: { id: 'updatedWorkflow', initial: 'queued', states: { queued: { on: { ASSIGN: 'assigned' } }, assigned: { type: 'final' } } } })
  @IsOptional()
  @IsObject()
  xstateDefinition?: any;

  @ApiPropertyOptional({ example: { states: ['queued', 'assigned'] } })
  @IsOptional()
  @IsObject()
  stateSchema?: any;

  @ApiPropertyOptional({ example: [{ type: 'ASSIGN' }] })
  @IsOptional()
  @IsArray()
  eventSchema?: any[];

  @ApiPropertyOptional({ enum: WorkflowStatus, example: 'ACTIVE', description: 'Workflow status' })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiPropertyOptional({ example: { layout: 'dagre', direction: 'LR' } })
  @IsOptional()
  @IsObject()
  visualizationConfig?: any;

  @ApiPropertyOptional({ example: { version: '2.0' } })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class SimulateWorkflowDto {
  @ApiProperty({ description: 'Initial context for simulation', example: { taskId: 'task-001', assignedTo: null, reworkCount: 0 } })
  @IsObject()
  initialContext: any;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    description: 'Events to simulate',
    example: [
      { type: 'ASSIGN', payload: { userId: 'user-001' } },
      { type: 'SUBMIT' },
      { type: 'APPROVE' },
    ],
  })
  @IsArray()
  events: Array<{ type: string; payload?: any }>;
}

export class WorkflowValidationResultDto {
  @ApiProperty({ example: true, description: 'Whether the workflow definition is valid' })
  isValid: boolean;

  @ApiProperty({ type: 'array', items: { type: 'string' }, example: [], description: 'Validation errors' })
  errors: string[];

  @ApiProperty({ type: 'array', items: { type: 'string' }, example: ['State "review" has no outgoing transitions'], description: 'Validation warnings' })
  warnings: string[];

  @ApiPropertyOptional({ example: 'https://stately.ai/viz?id=abc123', description: 'Link to XState visualizer' })
  visualizationUrl?: string;
}
