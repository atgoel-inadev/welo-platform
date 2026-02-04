import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from './task.service';
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
} from '../dto/task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('api/v1/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async listTasks(@Query() filter: TaskFilterDto) {
    return this.taskService.listTasks(filter);
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
}
