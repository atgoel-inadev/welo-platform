import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsEnum } from 'class-validator';
import { WorkflowInstanceStatus as InstanceStatus } from '@app/common';

export class CreateInstanceDto {
  @ApiProperty()
  @IsString()
  workflowId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsObject()
  initialContext: any;
}

export class StopInstanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  force?: boolean;
}

export class RestoreInstanceDto {
  @ApiProperty()
  @IsObject()
  snapshot: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkpointId?: string;
}

export class InstanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workflowId: string;

  @ApiPropertyOptional()
  batchId?: string;

  @ApiProperty()
  actorState: {
    value: string | object;
    context: any;
    children?: any;
  };

  @ApiProperty({ enum: InstanceStatus })
  status: InstanceStatus;

  @ApiProperty()
  startedAt: string;

  @ApiPropertyOptional()
  completedAt?: string;
}
