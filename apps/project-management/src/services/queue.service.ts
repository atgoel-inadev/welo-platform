import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from '@app/common/entities';
import { QueueStatus, QueueType } from '@app/common/enums';

export interface CreateQueueDto {
  name: string;
  projectId: string;
  queueType: QueueType;
  priorityRules?: {
    priorityField: string;
    sortOrder: string;
    filters: any[];
  };
  assignmentRules?: {
    autoAssign: boolean;
    capacityLimits: Record<string, any>;
    skillRequirements: any[];
    loadBalancing: Record<string, any>;
  };
}

export interface UpdateQueueDto {
  name?: string;
  status?: QueueStatus;
  priorityRules?: CreateQueueDto['priorityRules'];
  assignmentRules?: CreateQueueDto['assignmentRules'];
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectRepository(Queue)
    private readonly queueRepo: Repository<Queue>,
  ) {}

  async listQueues(projectId?: string): Promise<Queue[]> {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.queueRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async getQueue(id: string): Promise<Queue> {
    const queue = await this.queueRepo.findOne({ where: { id } });
    if (!queue) throw new NotFoundException(`Queue ${id} not found`);
    return queue;
  }

  async createQueue(dto: CreateQueueDto): Promise<Queue> {
    const queue = this.queueRepo.create({
      name: dto.name,
      projectId: dto.projectId,
      queueType: dto.queueType,
      status: QueueStatus.ACTIVE,
      priorityRules: dto.priorityRules ?? null,
      assignmentRules: dto.assignmentRules ?? null,
      totalTasks: 0,
      pendingTasks: 0,
    });
    const saved = await this.queueRepo.save(queue);
    this.logger.log(`Queue created: ${saved.id} (project: ${dto.projectId})`);
    return saved;
  }

  async updateQueue(id: string, dto: UpdateQueueDto): Promise<Queue> {
    const queue = await this.getQueue(id);
    Object.assign(queue, dto);
    const updated = await this.queueRepo.save(queue);
    this.logger.log(`Queue updated: ${id}`);
    return updated;
  }

  async pauseQueue(id: string): Promise<Queue> {
    const queue = await this.getQueue(id);
    if (queue.status !== QueueStatus.ACTIVE) {
      throw new BadRequestException(`Queue is not active (current status: ${queue.status})`);
    }
    queue.status = QueueStatus.PAUSED;
    return this.queueRepo.save(queue);
  }

  async resumeQueue(id: string): Promise<Queue> {
    const queue = await this.getQueue(id);
    if (queue.status !== QueueStatus.PAUSED) {
      throw new BadRequestException(`Queue is not paused (current status: ${queue.status})`);
    }
    queue.status = QueueStatus.ACTIVE;
    return this.queueRepo.save(queue);
  }

  async archiveQueue(id: string): Promise<Queue> {
    const queue = await this.getQueue(id);
    queue.status = QueueStatus.ARCHIVED;
    return this.queueRepo.save(queue);
  }

  async getQueueStats(id: string): Promise<{ id: string; totalTasks: number; pendingTasks: number; status: QueueStatus }> {
    const queue = await this.getQueue(id);
    return {
      id: queue.id,
      totalTasks: queue.totalTasks,
      pendingTasks: queue.pendingTasks,
      status: queue.status,
    };
  }
}
