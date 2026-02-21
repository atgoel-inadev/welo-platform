import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GoldTaskService } from './gold-task.service';
import { CreateGoldTaskDto, UpdateGoldTaskDto, GoldCompareDto } from './dto/gold-task.dto';

@ApiTags('gold-tasks')
@ApiBearerAuth()
@Controller()
export class GoldTaskController {
  constructor(private readonly goldTaskService: GoldTaskService) {}

  @Post('tasks/:taskId/gold')
  @ApiOperation({ summary: 'Register a gold standard annotation for a task (admin/manager)' })
  @ApiResponse({ status: 201, description: 'Gold task registered' })
  @ApiResponse({ status: 409, description: 'Gold task already exists' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'projectId', required: true })
  async create(
    @Param('taskId') taskId: string,
    @Query('projectId') projectId: string,
    @Query('userId') userId: string,
    @Body() dto: CreateGoldTaskDto,
  ) {
    return this.goldTaskService.create(taskId, projectId, userId, dto);
  }

  @Get('tasks/:taskId/gold')
  @ApiOperation({ summary: 'Get the gold standard annotation for a task' })
  @ApiResponse({ status: 200, description: 'Gold task returned' })
  @ApiResponse({ status: 404, description: 'No gold task for this task' })
  async get(@Param('taskId') taskId: string) {
    return this.goldTaskService.findByTask(taskId);
  }

  @Patch('tasks/:taskId/gold')
  @ApiOperation({ summary: 'Update gold standard annotation' })
  @ApiResponse({ status: 200, description: 'Gold task updated' })
  async update(@Param('taskId') taskId: string, @Body() dto: UpdateGoldTaskDto) {
    return this.goldTaskService.update(taskId, dto);
  }

  @Post('tasks/:taskId/gold/compare')
  @ApiOperation({ summary: 'Manually trigger gold comparison for a specific annotation' })
  @ApiResponse({ status: 200, description: 'Comparison result returned' })
  async compare(@Param('taskId') taskId: string, @Body() dto: GoldCompareDto) {
    return this.goldTaskService.compareAnnotation(taskId, dto);
  }

  @Get('projects/:projectId/gold-tasks')
  @ApiOperation({ summary: 'List all gold tasks for a project' })
  @ApiResponse({ status: 200, description: 'Gold tasks returned' })
  async listByProject(@Param('projectId') projectId: string) {
    return this.goldTaskService.findAllByProject(projectId);
  }
}
