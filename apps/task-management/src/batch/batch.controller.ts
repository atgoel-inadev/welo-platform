import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Batch, Task } from '@app/common';
import { TaskStatus } from '@app/common/enums';

@ApiTags('batches')
@ApiBearerAuth()
@Controller('batches')
export class BatchController {
  constructor(
    @InjectRepository(Batch)
    private batchRepository: Repository<Batch>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List batches' })
  @ApiResponse({ status: 200, description: 'Batches retrieved successfully' })
  async findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const where: FindOptionsWhere<Batch> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status as any;

    const skip = (page - 1) * limit;

    const [batches, total] = await this.batchRepository.findAndCount({
      where,
      relations: ['project'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: batches,
      total,
      page,
      limit,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get batch by ID' })
  @ApiResponse({ status: 200, description: 'Batch retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async findOne(@Param('id') id: string) {
    const batch = await this.batchRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found`);
    }

    return batch;
  }

  @Post()
  @ApiOperation({ summary: 'Create batch' })
  @ApiResponse({ status: 201, description: 'Batch created successfully' })
  async create(@Body() body: { projectId: string; name: string; description?: string; priority?: number }) {
    const batch = this.batchRepository.create({
      projectId: body.projectId,
      name: body.name,
      description: body.description,
      priority: body.priority || 5,
      status: 'CREATED' as any,
      totalTasks: 0,
      completedTasks: 0,
    });

    return this.batchRepository.save(batch);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get batch statistics' })
  @ApiResponse({ status: 200, description: 'Batch statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async getStatistics(@Param('id') id: string) {
    const batch = await this.batchRepository.findOne({ where: { id } });
    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found`);
    }

    // Get task counts by status
    const taskCounts = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('task.batchId = :batchId', { batchId: id })
      .groupBy('task.status')
      .getRawMany();

    const statusMap: Record<string, number> = {};
    taskCounts.forEach((row) => {
      statusMap[row.status] = parseInt(row.count, 10);
    });

    const totalTasks = Object.values(statusMap).reduce((sum, c) => sum + c, 0);
    const completedTasks = (statusMap[TaskStatus.APPROVED] || 0) + (statusMap['COMPLETED'] || 0);
    const inProgressTasks =
      (statusMap[TaskStatus.ASSIGNED] || 0) +
      (statusMap[TaskStatus.IN_PROGRESS] || 0) +
      (statusMap[TaskStatus.SUBMITTED] || 0);
    const queuedTasks = statusMap[TaskStatus.QUEUED] || 0;

    // Get average time spent
    const avgTime = await this.taskRepository
      .createQueryBuilder('task')
      .select('AVG(task.actualDuration)', 'avgDuration')
      .where('task.batchId = :batchId', { batchId: id })
      .andWhere('task.actualDuration IS NOT NULL')
      .getRawOne();

    return {
      batchId: id,
      batchName: batch.name,
      totalTasks,
      completedTasks,
      inProgressTasks,
      queuedTasks,
      rejectedTasks: statusMap[TaskStatus.REJECTED] || 0,
      skippedTasks: statusMap[TaskStatus.SKIPPED] || 0,
      averageCompletionTime: avgTime?.avgDuration ? parseFloat(avgTime.avgDuration) : 0,
      completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }
}
