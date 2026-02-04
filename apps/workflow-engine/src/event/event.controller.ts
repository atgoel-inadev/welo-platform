import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventService } from './event.service';
import {
  SendEventDto,
  BatchSendEventDto,
  RestoreStateDto,
  CurrentStateResponseDto,
  TransitionResultDto,
  PossibleTransitionsDto,
} from './dto/event.dto';
import { ResponseDto } from '@app/common';

@ApiTags('events')
@ApiBearerAuth()
@Controller()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('tasks/:taskId/events')
  @ApiOperation({ summary: 'Send event to task state machine' })
  @ApiResponse({ status: 200, description: 'Event processed', type: TransitionResultDto })
  async sendEventToTask(
    @Param('taskId') taskId: string,
    @Body() eventDto: SendEventDto,
    @Query('workflowId') workflowId: string,
  ) {
    const result = await this.eventService.sendEvent('TASK', taskId, workflowId, eventDto);
    return new ResponseDto(result);
  }

  @Get('tasks/:taskId/state')
  @ApiOperation({ summary: 'Get current state of task' })
  @ApiResponse({ status: 200, description: 'Current state', type: CurrentStateResponseDto })
  async getTaskState(
    @Param('taskId') taskId: string,
    @Query('workflowId') workflowId: string,
  ) {
    const state = await this.eventService.getCurrentState('TASK', taskId, workflowId);
    return new ResponseDto(state);
  }

  @Get('tasks/:taskId/state-history')
  @ApiOperation({ summary: 'Get state transition history for task' })
  @ApiResponse({ status: 200, description: 'State history' })
  async getTaskStateHistory(
    @Param('taskId') taskId: string,
    @Query('limit') limit: number = 50,
  ) {
    const history = await this.eventService.getStateHistory('TASK', taskId, limit);
    return new ResponseDto(history);
  }

  @Post('tasks/:taskId/state/restore')
  @ApiOperation({ summary: 'Restore task to previous state' })
  @ApiResponse({ status: 200, description: 'State restored' })
  async restoreTaskState(
    @Param('taskId') taskId: string,
    @Body() restoreDto: RestoreStateDto,
  ) {
    const result = await this.eventService.restoreState(
      'TASK',
      taskId,
      restoreDto.transitionId,
      restoreDto.reason,
    );
    return new ResponseDto(result);
  }

  @Get('tasks/:taskId/transitions')
  @ApiOperation({ summary: 'Get possible transitions for task' })
  @ApiResponse({ status: 200, description: 'Possible transitions', type: PossibleTransitionsDto })
  async getPossibleTransitions(
    @Param('taskId') taskId: string,
    @Query('workflowId') workflowId: string,
  ) {
    const transitions = await this.eventService.getPossibleTransitions(
      'TASK',
      taskId,
      workflowId,
    );
    return new ResponseDto(transitions);
  }

  @Post('events/batch')
  @ApiOperation({ summary: 'Send batch events to multiple entities' })
  @ApiResponse({ status: 200, description: 'Batch events processed' })
  async sendBatchEvents(@Body() batchDto: BatchSendEventDto) {
    const result = await this.eventService.sendBatchEvents(batchDto);
    return new ResponseDto(result);
  }

  @Get('tasks/by-state')
  @ApiOperation({ summary: 'Query tasks by current state' })
  @ApiResponse({ status: 200, description: 'Tasks in specified state' })
  async getTasksByState(
    @Query('workflowId') workflowId: string,
    @Query('state') state: string,
    @Query('projectId') projectId?: string,
  ) {
    // This would need integration with task management service
    return new ResponseDto({
      message: 'Feature requires integration with Task Management service',
      workflowId,
      state,
      projectId,
    });
  }
}
