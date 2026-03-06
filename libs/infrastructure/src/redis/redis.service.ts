import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: false,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  onModuleDestroy() {
    this.client.disconnect();
    this.logger.log('Redis connection closed');
  }

  // ── Basic Operations ────────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /** Atomic SET if Not eXists with TTL in milliseconds. Returns true if lock was acquired. */
  async setNx(key: string, value: string, ttlMs: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.client.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // ── JSON Operations ─────────────────────────────────────────────────────────

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  // ── Sorted Set Operations ───────────────────────────────────────────────────

  /** Add a member with the given score. NX = only add if not already present. */
  async zaddNx(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, 'NX', score, member) as Promise<number>;
  }

  /** Add a member with the given score (replaces if exists). */
  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  /** Atomically pop and return the member with the lowest score. */
  async zpopmin(key: string): Promise<string | null> {
    const result = await this.client.zpopmin(key, 1);
    return result.length >= 2 ? (result[0] as string) : null;
  }

  /** Atomically pop and return the member with the highest score. */
  async zpopmax(key: string): Promise<string | null> {
    const result = await this.client.zpopmax(key, 1);
    return result.length >= 2 ? (result[0] as string) : null;
  }

  /** Remove a member from the sorted set. */
  async zrem(key: string, member: string): Promise<void> {
    await this.client.zrem(key, member);
  }

  /** Number of members in the sorted set. */
  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  /** Get score of a member. */
  async zscore(key: string, member: string): Promise<number | null> {
    const score = await this.client.zscore(key, member);
    return score !== null ? parseFloat(score) : null;
  }

  /** Get members in a range by score. */
  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    return this.client.zrangebyscore(key, min, max);
  }

  /** Get members in a range by rank (0-based). */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrange(key, start, stop);
  }

  // ── Hash Operations ─────────────────────────────────────────────────────────

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    if (fields.length > 0) await this.client.hdel(key, ...fields);
  }

  async hexists(key: string, field: string): Promise<boolean> {
    return (await this.client.hexists(key, field)) === 1;
  }

  // ── List Operations ─────────────────────────────────────────────────────────

  async lpush(key: string, ...values: string[]): Promise<void> {
    await this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<void> {
    await this.client.rpush(key, ...values);
  }

  async lpop(key: string): Promise<string | null> {
    return this.client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    return this.client.rpop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  // ── Set Operations ──────────────────────────────────────────────────────────

  async sadd(key: string, ...members: string[]): Promise<void> {
    if (members.length > 0) await this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    if (members.length > 0) await this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return (await this.client.sismember(key, member)) === 1;
  }

  async scard(key: string): Promise<number> {
    return this.client.scard(key);
  }

  // ── Pub/Sub Operations ──────────────────────────────────────────────────────

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (ch, msg) => {
      if (ch === channel) callback(msg);
    });
  }

  // ── Utility Methods ─────────────────────────────────────────────────────────

  async flushdb(): Promise<void> {
    await this.client.flushdb();
    this.logger.warn('Redis database flushed');
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed', error);
      return false;
    }
  }

  getClient(): Redis {
    return this.client;
  }
}
