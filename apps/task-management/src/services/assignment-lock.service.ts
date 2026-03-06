import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/infrastructure';

/**
 * Provides short-lived optimistic locks for task assignment.
 *
 * When a user claims a task, we hold a 30-second lock while the assignment
 * row is written to Postgres. Any concurrent claim attempt for the same task
 * sees the lock and fails fast, without ever touching the database.
 *
 * Key schema:  assignment_lock:{taskId}
 * Value:       userId who holds the lock
 * TTL:         LOCK_TTL_MS (default 30 s) — auto-expires if the service crashes mid-flight
 */
@Injectable()
export class AssignmentLockService {
  private readonly logger = new Logger(AssignmentLockService.name);
  private static readonly LOCK_TTL_MS = 30_000;

  private lockKey(taskId: string): string {
    return `assignment_lock:${taskId}`;
  }

  constructor(private readonly redis: RedisService) {}

  /**
   * Try to acquire the assignment lock for a task.
   * Returns true if the lock was acquired (this user may proceed to assign).
   * Returns false if another request already holds the lock.
   */
  async acquire(taskId: string, userId: string): Promise<boolean> {
    const acquired = await this.redis.setNx(this.lockKey(taskId), userId, AssignmentLockService.LOCK_TTL_MS);
    if (!acquired) {
      this.logger.debug(`Lock NOT acquired for task ${taskId} by user ${userId}`);
    }
    return acquired;
  }

  /**
   * Release the lock after the assignment row has been committed.
   */
  async release(taskId: string): Promise<void> {
    await this.redis.del(this.lockKey(taskId));
  }

  /**
   * Check whether any lock exists for a task (read-only check, does not acquire).
   */
  async isLocked(taskId: string): Promise<boolean> {
    return this.redis.exists(this.lockKey(taskId));
  }
}
