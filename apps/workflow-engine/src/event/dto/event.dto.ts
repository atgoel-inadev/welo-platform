import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsEnum } from 'class-validator';

export class SendEventDto {
  @ApiProperty({ description: 'Event type', example: 'SUBMIT' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Event payload' })
  @IsOptional()
  @IsObject()
  payload?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class BatchSendEventDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  events: Array<{
    entityType: string;
    entityId: string;
    event: {
      type: string;
      payload?: any;
    };
  }>;
}

export class RestoreStateDto {
  @ApiProperty()
  @IsString()
  transitionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CurrentStateResponseDto {
  @ApiProperty()
  taskId: string;

  @ApiProperty()
  workflowId: string;

  @ApiProperty()
  currentState: {
    value: string | object;
    context: any;
    tags?: string[];
    done: boolean;
  };

  @ApiProperty({ type: 'array', items: { type: 'string' } })
  nextEvents: string[];

  @ApiProperty()
  canTransition: boolean;

  @ApiProperty()
  stateUpdatedAt: string;
}

export class TransitionResultDto {
  @ApiProperty()
  transitionId: string;

  @ApiProperty()
  previousState: {
    value: string | object;
    context: any;
  };

  @ApiProperty()
  currentState: {
    value: string | object;
    context: any;
    changed: boolean;
    tags?: string[];
  };

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  actionsExecuted: Array<{
    action: string;
    result: string;
  }>;
}

export class PossibleTransitionsDto {
  @ApiProperty()
  currentState: string | object;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  possibleEvents: Array<{
    eventType: string;
    targetState: string;
    guards?: string[];
    canExecute: boolean;
  }>;
}
