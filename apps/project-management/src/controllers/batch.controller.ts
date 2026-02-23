import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { BatchService } from '../services/batch.service';
import {
  CreateBatchDto,
  UpdateBatchDto,
  AllocateFilesDto,
  AllocateFolderDto,
  AssignTaskDto,
  PullNextTaskDto,
} from '../dto/batch.dto';

@ApiTags('batches')
@ApiBearerAuth()
@Controller('batches')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  /**
   * List all batches, optionally filtered by projectId
   * GET /api/v1/batches?projectId=xxx
   */
  @Get()
  @ApiOperation({ summary: 'List all batches, optionally filtered by project' })
  @ApiResponse({ status: 200, description: 'Batches retrieved successfully' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  async listBatches(@Query('projectId') projectId?: string) {
    return this.batchService.listBatches(projectId);
  }

  /**
   * Get a single batch by ID
   * GET /api/v1/batches/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get batch by ID' })
  @ApiResponse({ status: 200, description: 'Batch retrieved' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async getBatch(@Param('id') id: string) {
    return this.batchService.getBatch(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new batch' })
  @ApiResponse({ status: 201, description: 'Batch created successfully' })
  async createBatch(@Body() dto: CreateBatchDto) {
    return this.batchService.createBatch(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update batch' })
  @ApiResponse({ status: 200, description: 'Batch updated' })
  async updateBatch(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    return this.batchService.updateBatch(id, dto);
  }

  @Post(':id/allocate-files')
  @ApiOperation({ summary: 'Allocate files to a batch (creates tasks from files)' })
  @ApiResponse({ status: 201, description: 'Files allocated, tasks created' })
  async allocateFiles(@Param('id') id: string, @Body() dto: AllocateFilesDto) {
    return this.batchService.allocateFiles(id, dto);
  }

  @Post(':id/allocate-folder')
  @ApiOperation({ summary: 'Allocate files from a folder path to the batch' })
  @ApiResponse({ status: 201, description: 'Folder files allocated' })
  async allocateFolder(@Param('id') id: string, @Body() dto: AllocateFolderDto) {
    return this.batchService.allocateFolder(id, dto);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get batch statistics (task counts, completion rate, quality)' })
  @ApiResponse({ status: 200, description: 'Batch statistics retrieved' })
  async getBatchStatistics(@Param('id') id: string) {
    return this.batchService.getBatchStatistics(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark batch as completed' })
  @ApiResponse({ status: 200, description: 'Batch marked complete' })
  async completeBatch(@Param('id') id: string) {
    return this.batchService.completeBatch(id);
  }

  @Post('assign-task')
  @ApiOperation({ summary: 'Assign a specific task to a user' })
  @ApiResponse({ status: 200, description: 'Task assigned' })
  async assignTask(@Body() dto: AssignTaskDto) {
    return this.batchService.assignTask(dto);
  }

  @Post('pull-next-task')
  @ApiOperation({ summary: 'Pull the next available task for a user' })
  @ApiResponse({ status: 200, description: 'Next task returned' })
  @ApiResponse({ status: 404, description: 'No available tasks' })
  async pullNextTask(@Body() dto: PullNextTaskDto) {
    return this.batchService.pullNextTask(dto);
  }

  /**
   * Auto-assign unassigned tasks in a batch to eligible annotators.
   * Supports AUTO_ROUND_ROBIN (default), AUTO_WORKLOAD_BASED, AUTO_SKILL_BASED.
   */
  @Post(':id/auto-assign')
  @ApiOperation({ summary: 'Auto-assign unassigned tasks in batch to eligible annotators' })
  @ApiResponse({ status: 200, description: 'Tasks auto-assigned' })
  @ApiBody({ schema: { properties: { assignmentMethod: { type: 'string', enum: ['AUTO_ROUND_ROBIN', 'AUTO_WORKLOAD_BASED', 'AUTO_SKILL_BASED'], example: 'AUTO_ROUND_ROBIN' } } } })
  async autoAssignTasksInBatch(
    @Param('id') batchId: string,
    @Body() body: { assignmentMethod?: string },
  ) {
    const method = (body?.assignmentMethod || 'AUTO_ROUND_ROBIN') as
      | 'AUTO_ROUND_ROBIN'
      | 'AUTO_WORKLOAD_BASED'
      | 'AUTO_SKILL_BASED';
    
    // Get unassigned tasks for this batch
    const tasks = await this.batchService.getUnassignedTasksForBatch(batchId);
    
    // Auto-assign them
    await this.batchService.autoAssignTasks(tasks, method);
    
    return { success: true, assignedCount: tasks.length };
  }
}
