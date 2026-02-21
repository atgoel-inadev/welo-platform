import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { StageAssignmentService } from '../services/stage-assignment.service';
import {
  CreateTaskDto,
  CreateTaskBulkDto,
  UpdateTaskDto,
  AssignTaskDto,
  SubmitTaskDto,
  UpdateTaskStatusDto,
  GetNextTaskDto,
  TaskFilterDto,
  BulkTaskActionDto,
  TaskTransitionDto,
  SaveAnnotationDto,
  SaveReviewDto,
  TimeAnalyticsQueryDto,
  AssignTaskToStageDto,
  GetNextTaskForStageDto,
  IncrementReworkDto,
} from '../dto/task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly stageAssignmentService: StageAssignmentService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List tasks with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async listTasks(@Query() filter: TaskFilterDto) {
    return this.taskService.listTasks(filter);
  }

  @Get('analytics/time')
  @ApiOperation({ summary: 'Get time analytics for annotators and reviewers' })
  @ApiResponse({ status: 200, description: 'Time analytics retrieved successfully' })
  async getTimeAnalytics(@Query() query: TimeAnalyticsQueryDto) {
    return this.taskService.getTimeAnalytics(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTask(@Param('id') id: string) {
    return this.taskService.getTask(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Project, batch, or workflow not found' })
  async createTask(@Body() dto: CreateTaskDto) {
    return this.taskService.createTask(dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple tasks in bulk' })
  @ApiResponse({ status: 201, description: 'Tasks created successfully' })
  async createTasksBulk(@Body() dto: CreateTaskBulkDto) {
    return this.taskService.createTasksBulk(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.updateTask(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task (soft delete)' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async deleteTask(@Param('id') id: string) {
    await this.taskService.deleteTask(id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign task to a user' })
  @ApiResponse({ status: 201, description: 'Task assigned successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 409, description: 'Task already assigned to user' })
  async assignTask(@Param('id') taskId: string, @Body() dto: Omit<AssignTaskDto, 'taskId'>) {
    return this.taskService.assignTask({ ...dto, taskId });
  }

  @Post('next')
  @ApiOperation({ summary: 'Get next available task for user (FIFO queue)' })
  @ApiResponse({ status: 200, description: 'Next task retrieved and assigned' })
  @ApiResponse({ status: 404, description: 'No available tasks' })
  async getNextTask(@Body() dto: GetNextTaskDto) {
    const task = await this.taskService.getNextTask(dto);
    if (!task) {
      return { message: 'No available tasks', task: null };
    }
    return task;
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit task with annotations' })
  @ApiResponse({ status: 200, description: 'Task submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid submission' })
  @ApiResponse({ status: 404, description: 'Task or assignment not found' })
  async submitTask(@Param('id') taskId: string, @Body() dto: Omit<SubmitTaskDto, 'taskId'>) {
    return this.taskService.submitTask({ ...dto, taskId });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status' })
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async updateTaskStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto) {
    return this.taskService.updateTaskStatus(id, dto);
  }

  @Post(':id/events')
  @ApiOperation({ summary: 'Send event to task (XState transition)' })
  @ApiResponse({ status: 200, description: 'Event sent successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async sendEvent(@Param('id') id: string, @Body() dto: TaskTransitionDto) {
    return this.taskService.sendEvent(id, dto);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get task statistics and metrics' })
  @ApiResponse({ status: 200, description: 'Task statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskStatistics(@Param('id') id: string) {
    return this.taskService.getTaskStatistics(id);
  }

  @Post('bulk-action')
  @ApiOperation({ summary: 'Perform bulk action on multiple tasks' })
  @ApiResponse({ status: 200, description: 'Bulk action completed' })
  async bulkAction(@Body() dto: BulkTaskActionDto) {
    return this.taskService.bulkAction(dto);
  }

  @Get(':id/render-config')
  @ApiOperation({
    summary: 'Get task render configuration',
    description: 'Returns complete configuration for rendering task UI (file viewer + questions + extra widgets)',
  })
  @ApiResponse({ status: 200, description: 'Render configuration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskRenderConfig(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.taskService.getTaskRenderConfig(id, userId);
  }

  @Post(':id/annotation')
  @ApiOperation({
    summary: 'Save annotation response',
    description: 'Saves annotator responses to annotation questions + extra widget data',
  })
  @ApiResponse({ status: 200, description: 'Annotation saved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async saveAnnotation(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() dto: SaveAnnotationDto,
  ) {
    return this.taskService.saveAnnotation(id, userId, dto);
  }

  @Post(':id/review')
  @ApiOperation({
    summary: 'Save review decision',
    description: 'Saves reviewer decision (approve/reject) + quality score + review widget data',
  })
  @ApiResponse({ status: 200, description: 'Review saved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async saveReview(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() dto: SaveReviewDto,
  ) {
    return this.taskService.saveReview(id, userId, dto);
  }

  @Get(':id/annotation-history')
  @ApiOperation({
    summary: 'Get task annotation history',
    description: 'Returns complete history of annotations and reviews for audit/tracking',
  })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getAnnotationHistory(@Param('id') id: string) {
    return this.taskService.getAnnotationHistory(id);
  }

  // ========== Stage-Based Workflow Endpoints ==========

  @Post(':taskId/assign-stage')
  @ApiOperation({ 
    summary: 'Assign task to user in specific workflow stage',
    description: 'Enforces stage-specific user restrictions, rework limits, and capacity constraints'
  })
  @ApiResponse({ status: 201, description: 'Task assigned to stage successfully' })
  @ApiResponse({ status: 404, description: 'Task or stage not found' })
  @ApiResponse({ status: 400, description: 'User not authorized or limits exceeded' })
  @ApiResponse({ status: 409, description: 'Task already assigned to user in this stage' })
  async assignTaskToStage(
    @Param('taskId') taskId: string,
    @Body() dto: AssignTaskToStageDto,
  ) {
    return this.stageAssignmentService.assignTaskToStage(
      taskId,
      dto.userId,
      dto.stageId,
      dto.assignmentMethod as any,
    );
  }

  @Get('next-for-stage')
  @ApiOperation({
    summary: 'Get next available task for user in specific stage',
    description: 'Returns next task requiring assignment in specified stage with auto-assignment support'
  })
  @ApiResponse({ status: 200, description: 'Next task retrieved' })
  @ApiResponse({ status: 404, description: 'Project or stage not found' })
  async getNextTaskForStage(@Query() dto: GetNextTaskForStageDto) {
    const task = await this.stageAssignmentService.getNextTaskForStage(
      dto.userId,
      dto.projectId,
      dto.stageId,
    );
    
    if (!task) {
      return { message: 'No available tasks for this stage', task: null };
    }
    
    return task;
  }

  @Post(':taskId/increment-rework')
  @ApiOperation({
    summary: 'Increment rework count for task in stage',
    description: 'Tracks rework attempts when quality checks fail or changes are requested'
  })
  @ApiResponse({ status: 200, description: 'Rework count incremented' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async incrementReworkCount(
    @Param('taskId') taskId: string,
    @Body() dto: IncrementReworkDto,
  ) {
    await this.stageAssignmentService.incrementReworkCount(taskId, dto.stageId);
    return { message: 'Rework count incremented successfully' };
  }

  @Get(':taskId/stage-quality-check/:stageId')
  @ApiOperation({
    summary: 'Check if task passes quality gate for stage',
    description: 'Validates quality score against stage threshold'
  })
  @ApiResponse({ status: 200, description: 'Quality gate check completed' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async checkStageQualityGate(
    @Param('taskId') taskId: string,
    @Param('stageId') stageId: string,
    @Query('qualityScore') qualityScore: number,
  ) {
    return this.stageAssignmentService.checkStageQualityGate(taskId, stageId, qualityScore);
  }
}
