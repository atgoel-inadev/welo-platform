import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsEnum } from 'class-validator';

export class SendEventDto {
  @ApiProperty({ description: 'Event type', example: 'SUBMIT' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Event payload', example: { userId: '650e8400-e29b-41d4-a716-446655440010', reason: 'Annotation completed' } })
  @IsOptional()
  @IsObject()
  payload?: any;

  @ApiPropertyOptional({ example: '2025-02-15T14:30:00.000Z', description: 'Event timestamp' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class BatchSendEventDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    description: 'Batch of events to send',
    example: [
      { entityType: 'TASK', entityId: 'task-001', event: { type: 'SUBMIT', payload: { userId: 'user-001' } } },
      { entityType: 'TASK', entityId: 'task-002', event: { type: 'ASSIGN', payload: { userId: 'user-002' } } },
    ],
  })
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
  @ApiProperty({ example: 'trans-550e8400-e29b-41d4-a716-001', description: 'Transition ID to restore to' })
  @IsString()
  transitionId: string;

  @ApiPropertyOptional({ example: 'Reverting due to incorrect review decision', description: 'Reason for state restoration' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CurrentStateResponseDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440021' })
  taskId: string;

  @ApiProperty({ example: 'wf-550e8400-e29b-41d4-a716-446655440001' })
  workflowId: string;

  @ApiProperty({
    description: 'Current state machine state',
    example: { value: 'in_review', context: { assignedTo: 'user-001', reworkCount: 0 }, tags: ['review'], done: false },
  })
  currentState: {
    value: string | object;
    context: any;
    tags?: string[];
    done: boolean;
  };

  @ApiProperty({ type: 'array', items: { type: 'string' }, example: ['APPROVE', 'REJECT', 'REQUEST_REVISION'] })
  nextEvents: string[];

  @ApiProperty({ example: true, description: 'Whether the state can transition' })
  canTransition: boolean;

  @ApiProperty({ example: '2025-02-15T14:30:00.000Z' })
  stateUpdatedAt: string;
}

export class TransitionResultDto {
  @ApiProperty({ example: 'trans-001' })
  transitionId: string;

  @ApiProperty({ example: { value: 'assigned', context: { assignedTo: 'user-001' } } })
  previousState: {
    value: string | object;
    context: any;
  };

  @ApiProperty({ example: { value: 'in_review', context: { assignedTo: 'user-001', submitCount: 1 }, changed: true, tags: ['review'] } })
  currentState: {
    value: string | object;
    context: any;
    changed: boolean;
    tags?: string[];
  };

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    example: [{ action: 'notifyReviewer', result: 'success' }],
  })
  actionsExecuted: Array<{
    action: string;
    result: string;
  }>;
}

export class PossibleTransitionsDto {
  @ApiProperty({ example: 'in_review', description: 'Current state' })
  currentState: string | object;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    example: [
      { eventType: 'APPROVE', targetState: 'completed', guards: [], canExecute: true },
      { eventType: 'REJECT', targetState: 'assigned', guards: ['hasReviewPermission'], canExecute: true },
      { eventType: 'REQUEST_REVISION', targetState: 'revision', guards: [], canExecute: true },
    ],
  })
  possibleEvents: Array<{
    eventType: string;
    targetState: string;
    guards?: string[];
    canExecute: boolean;
  }>;
}
