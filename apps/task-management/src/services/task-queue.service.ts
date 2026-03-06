import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/infrastructure';

/**
 * Manages task availability queues in Redis using sorted sets.
 *
 * Key schema:  task_queue:{projectId}:{taskType}
 * Score:       (10 - priority) * 1e10 + created_at_unix_seconds
 *
 * This means: higher priority = lower score = first out with ZPOPMIN.
 * Within the same priority, the oldest task (FIFO) wins.
 *
 * Callers must enqueue tasks on creation and dequeue on claim.
 * Dequeue is atomic (Redis ZPOPMIN), eliminating the SELECT race condition.
 */
@Injectable()
export class TaskQueueService {
  private readonly logger = new Logger(TaskQueueService.name);

  // Score divisor: up to 10 priority levels, unix timestamps fit in 10 digits
  private static readonly PRIORITY_MULTIPLIER = 1e10;

  constructor(private readonly redis: RedisService) {}

  private queueKey(projectId: string, taskType: string): string {
    return `task_queue:${projectId}:${taskType}`;
  }

  private globalQueueKey(projectId: string): string {
    return `task_queue:${projectId}:ALL`;
  }

  private score(priority: number, createdAt: Date): number {
    // Lower score = dequeued first. Priority 10 → offset 0; Priority 1 → offset 9e10.
    const priorityOffset = (10 - priority) * TaskQueueService.PRIORITY_MULTIPLIER;
    return priorityOffset + Math.floor(createdAt.getTime() / 1000);
  }

  /**
   * Add a task to the queue. Uses NX so idempotent if called multiple times.
   */
  async enqueue(taskId: string, projectId: string, taskType: string, priority: number, createdAt: Date): Promise<void> {
    const s = this.score(priority, createdAt);
    const typeKey = this.queueKey(projectId, taskType);
    const allKey = this.globalQueueKey(projectId);

    await Promise.all([
      this.redis.zaddNx(typeKey, s, taskId),
      this.redis.zaddNx(allKey, s, taskId),
    ]);
    this.logger.debug(`Enqueued task ${taskId} to ${typeKey} score=${s}`);
  }

  /**
   * Atomically pop the highest-priority (lowest-score) task from the queue.
   * Returns null if the queue is empty.
   */
  async dequeue(projectId: string, taskType?: string): Promise<string | null> {
    const key = taskType ? this.queueKey(projectId, taskType) : this.globalQueueKey(projectId);
    const taskId = await this.redis.zpopmin(key);

    if (taskId) {
      // If dequeuing from the type-specific queue, also remove from global.
      if (taskType) {
        await this.redis.zrem(this.globalQueueKey(projectId), taskId);
      }
      this.logger.debug(`Dequeued task ${taskId} from ${key}`);
    }

    return taskId;
  }

  /**
   * Remove a task from all queues for a project (e.g., when manually assigned or status changed).
   */
  async remove(taskId: string, projectId: string, taskType: string): Promise<void> {
    await Promise.all([
      this.redis.zrem(this.queueKey(projectId, taskType), taskId),
      this.redis.zrem(this.globalQueueKey(projectId), taskId),
    ]);
  }

  /**
   * Number of tasks waiting in a queue.
   */
  async size(projectId: string, taskType?: string): Promise<number> {
    const key = taskType ? this.queueKey(projectId, taskType) : this.globalQueueKey(projectId);
    return this.redis.zcard(key);
  }
}
