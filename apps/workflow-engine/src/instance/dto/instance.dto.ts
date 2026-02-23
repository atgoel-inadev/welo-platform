import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsEnum } from 'class-validator';
import { WorkflowInstanceStatus as InstanceStatus } from '@app/common';

export class CreateInstanceDto {
  @ApiProperty({ example: 'wf-550e8400-e29b-41d4-a716-446655440001', description: 'Workflow definition ID' })
  @IsString()
  workflowId: string;

  @ApiPropertyOptional({ example: '750e8400-e29b-41d4-a716-446655440001', description: 'Batch ID to associate with' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ example: 'Batch-1 Processing Instance', description: 'Instance name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Initial context for the workflow instance', example: { taskId: 'task-001', projectId: 'proj-001', reworkCount: 0 } })
  @IsObject()
  initialContext: any;
}

export class StopInstanceDto {
  @ApiPropertyOptional({ example: 'Batch cancelled by project manager', description: 'Reason for stopping' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ default: false, example: false, description: 'Force stop even with pending transitions' })
  @IsOptional()
  force?: boolean;
}

export class RestoreInstanceDto {
  @ApiProperty({ description: 'Snapshot state to restore', example: { value: 'assigned', context: { taskId: 'task-001', reworkCount: 1 } } })
  @IsObject()
  snapshot: any;

  @ApiPropertyOptional({ example: 'chk-20250215-001', description: 'Checkpoint ID to restore from' })
  @IsOptional()
  @IsString()
  checkpointId?: string;
}

export class InstanceResponseDto {
  @ApiProperty({ example: 'inst-550e8400-e29b-41d4-a716-446655440001' })
  id: string;

  @ApiProperty({ example: 'wf-550e8400-e29b-41d4-a716-446655440001' })
  workflowId: string;

  @ApiPropertyOptional({ example: '750e8400-e29b-41d4-a716-446655440001' })
  batchId?: string;

  @ApiProperty({
    description: 'Current actor state',
    example: { value: 'in_review', context: { taskId: 'task-001', assignedTo: 'user-001', submitCount: 1 }, children: {} },
  })
  actorState: {
    value: string | object;
    context: any;
    children?: any;
  };

  @ApiProperty({ enum: InstanceStatus, example: 'RUNNING', description: 'Instance status' })
  status: InstanceStatus;

  @ApiProperty({ example: '2025-02-15T10:00:00.000Z' })
  startedAt: string;

  @ApiPropertyOptional({ example: '2025-02-15T12:30:00.000Z' })
  completedAt?: string;
}
