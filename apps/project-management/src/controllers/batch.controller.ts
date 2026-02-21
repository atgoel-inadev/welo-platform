import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { BatchService } from '../services/batch.service';
import {
  CreateBatchDto,
  UpdateBatchDto,
  AllocateFilesDto,
  AllocateFolderDto,
  AssignTaskDto,
  PullNextTaskDto,
} from '../dto/batch.dto';

@Controller('batches')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  async createBatch(@Body() dto: CreateBatchDto) {
    return this.batchService.createBatch(dto);
  }

  @Patch(':id')
  async updateBatch(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    return this.batchService.updateBatch(id, dto);
  }

  @Post(':id/allocate-files')
  async allocateFiles(@Param('id') id: string, @Body() dto: AllocateFilesDto) {
    return this.batchService.allocateFiles(id, dto);
  }

  @Post(':id/allocate-folder')
  async allocateFolder(@Param('id') id: string, @Body() dto: AllocateFolderDto) {
    return this.batchService.allocateFolder(id, dto);
  }

  @Get(':id/statistics')
  async getBatchStatistics(@Param('id') id: string) {
    return this.batchService.getBatchStatistics(id);
  }

  @Post(':id/complete')
  async completeBatch(@Param('id') id: string) {
    return this.batchService.completeBatch(id);
  }

  @Post('assign-task')
  async assignTask(@Body() dto: AssignTaskDto) {
    return this.batchService.assignTask(dto);
  }

  @Post('pull-next-task')
  async pullNextTask(@Body() dto: PullNextTaskDto) {
    return this.batchService.pullNextTask(dto);
  }

  /**
   * Auto-assign unassigned tasks in a batch to eligible annotators.
   * Supports AUTO_ROUND_ROBIN (default), AUTO_WORKLOAD_BASED, AUTO_SKILL_BASED.
   */
  @Post(':id/auto-assign')
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
