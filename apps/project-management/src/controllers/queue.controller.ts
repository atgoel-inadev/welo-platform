import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QueueService, CreateQueueDto, UpdateQueueDto } from '../services/queue.service';
import { QueueType } from '@app/common/enums';

@ApiTags('queues')
@ApiBearerAuth()
@Controller('queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOperation({ summary: 'List queues, optionally filtered by project' })
  @ApiResponse({ status: 200, description: 'Queues retrieved successfully' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  async listQueues(@Query('projectId') projectId?: string) {
    return this.queueService.listQueues(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get queue by ID' })
  @ApiResponse({ status: 200, description: 'Queue retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Queue not found' })
  async getQueue(@Param('id') id: string) {
    return this.queueService.getQueue(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new queue for a project' })
  @ApiResponse({ status: 201, description: 'Queue created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createQueue(@Body() dto: CreateQueueDto) {
    return this.queueService.createQueue(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update queue configuration' })
  @ApiResponse({ status: 200, description: 'Queue updated successfully' })
  @ApiResponse({ status: 404, description: 'Queue not found' })
  async updateQueue(@Param('id') id: string, @Body() dto: UpdateQueueDto) {
    return this.queueService.updateQueue(id, dto);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause an active queue' })
  @ApiResponse({ status: 200, description: 'Queue paused' })
  @ApiResponse({ status: 400, description: 'Queue is not active' })
  @ApiResponse({ status: 404, description: 'Queue not found' })
  async pauseQueue(@Param('id') id: string) {
    return this.queueService.pauseQueue(id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a paused queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed' })
  @ApiResponse({ status: 400, description: 'Queue is not paused' })
  @ApiResponse({ status: 404, description: 'Queue not found' })
  async resumeQueue(@Param('id') id: string) {
    return this.queueService.resumeQueue(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a queue (soft delete)' })
  @ApiResponse({ status: 204, description: 'Queue archived' })
  @ApiResponse({ status: 404, description: 'Queue not found' })
  async archiveQueue(@Param('id') id: string) {
    await this.queueService.archiveQueue(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get queue task statistics' })
  @ApiResponse({ status: 200, description: 'Queue stats retrieved' })
  @ApiResponse({ status: 404, description: 'Queue not found' })
  async getQueueStats(@Param('id') id: string) {
    return this.queueService.getQueueStats(id);
  }
}
