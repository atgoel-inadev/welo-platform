import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TransitionService } from './transition.service';
import { ResponseDto } from '@app/common';

@ApiTags('transitions')
@ApiBearerAuth()
@Controller('state-transitions')
export class TransitionController {
  constructor(private readonly transitionService: TransitionService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get state transition details' })
  @ApiResponse({ status: 200, description: 'Transition details' })
  async findOne(@Param('id') id: string) {
    const transition = await this.transitionService.findOne(id);
    return new ResponseDto(transition);
  }

  @Get()
  @ApiOperation({ summary: 'Query state transitions' })
  @ApiResponse({ status: 200, description: 'Transitions' })
  async findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('workflowId') workflowId?: string,
    @Query('eventType') eventType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('limit') limit: number = 100,
  ) {
    if (entityType && entityId) {
      const transitions = await this.transitionService.findByEntity(
        entityType,
        entityId,
        limit,
      );
      return new ResponseDto(transitions);
    }

    if (workflowId) {
      const transitions = await this.transitionService.findByWorkflow(workflowId, {
        eventType,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        limit,
      });
      return new ResponseDto(transitions);
    }

    return new ResponseDto([]);
  }
}
