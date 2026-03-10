/**
 * Example: Service Class - Updated to use IMessagingService
 * 
 * This demonstrates how to update service dependencies from KafkaService to IMessagingService
 */

import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

// ── UPDATED: Import messaging abstraction ────────────────────────────────────
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';

import { Task } from '@app/common';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    
    // ── UPDATED: Use IMessagingService with injection token ────────────────────
    @Inject(MESSAGING_SERVICE)
    private messagingService: IMessagingService,
  ) {}

  /**
   * Create a new task and publish event
   */
  async createTask(dto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create(dto);
    const savedTask = await this.taskRepository.save(task);

    // ── UNCHANGED: Same method signature, different provider ────────────────────
    await this.messagingService.publishTaskEvent('created', savedTask);

    return savedTask;
  }

  /**
   * Update task and publish event
   */
  async updateTask(id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.taskRepository.findOneOrFail({ where: { id } });
    Object.assign(task, dto);
    const updatedTask = await this.taskRepository.save(task);

    // ── UNCHANGED: Same method signature ────────────────────────────────────────
    await this.messagingService.publishTaskEvent('updated', updatedTask);

    return updatedTask;
  }

  /**
   * Assign task to user and publish events
   */
  async assignTask(taskId: string, userId: string): Promise<void> {
    const task = await this.taskRepository.findOneOrFail({ 
      where: { id: taskId },
      relations: ['assignments'],
    });

    // Business logic...
    task.status = 'assigned';
    await this.taskRepository.save(task);

    // ── UNCHANGED: Same method signatures ─────────────────────────────────────
    await this.messagingService.publishTaskEvent('assigned', task);
    
    await this.messagingService.publishNotification({
      userId,
      type: 'task_assigned',
      message: `Task ${task.externalId} assigned to you`,
      taskId: task.id,
    });
  }

  /**
   * Submit task annotation and request quality check
   */
  async submitAnnotation(taskId: string, annotationData: any): Promise<void> {
    const task = await this.taskRepository.findOneOrFail({ where: { id: taskId } });

    // Save annotation...
    task.status = 'submitted';
    const updatedTask = await this.taskRepository.save(task);

    // ── UNCHANGED: Same method signatures ─────────────────────────────────────
    await this.messagingService.publishTaskEvent('submitted', updatedTask);
    await this.messagingService.publishAnnotationEvent(annotationData);

    // Request quality check
    if (task.requiresQualityCheck) {
      await this.messagingService.publishQualityCheckRequest(updatedTask);
    }
  }

  /**
   * Publish custom event with correlation ID for tracing
   */
  async processTaskWithTracing(taskId: string, correlationId: string): Promise<void> {
    const task = await this.taskRepository.findOneOrFail({ where: { id: taskId } });

    // Business logic...

    // ── UNCHANGED: Same method signature ─────────────────────────────────────
    await this.messagingService.publishEvent(
      'task.processing',
      { taskId: task.id, status: task.status },
      'task-management-service',
      correlationId,
    );
  }
}
