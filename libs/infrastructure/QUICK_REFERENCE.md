# Shared Infrastructure Quick Reference

## Import Statement

```typescript
import { 
  KafkaModule, 
  KafkaService,
  RedisModule, 
  RedisService,
  HealthModule 
} from '@app/infrastructure';
```

## 1. KafkaModule - Event-Driven Communication

### Setup in App Module

```typescript
@Module({
  imports: [
    KafkaModule.forRoot({
      clientId: 'my-service',
      consumerGroupId: 'my-service-group',
      topics: ['event.created', 'event.updated'],
    }),
  ],
})
export class AppModule {}
```

### Publish Events

```typescript
@Injectable()
export class MyService {
  constructor(private kafka: KafkaService) {}

  async doSomething() {
    await this.kafka.publish('event.created', {
      id: '123',
      data: 'payload',
    });
  }
}
```

### Subscribe to Events

```typescript
@Injectable()
export class EventHandler implements OnModuleInit {
  constructor(private kafka: KafkaService) {}

  async onModuleInit() {
    await this.kafka.subscribe('event.created', async (payload) => {
      const msg = JSON.parse(payload.message.value.toString());
      console.log('Received:', msg);
    });
  }
}
```

## 2. RedisModule - Caching & Queuing

### Setup in App Module

```typescript
@Module({
  imports: [
    RedisModule,  // Global - no config needed
  ],
})
export class AppModule {}
```

### Basic Operations

```typescript
@Injectable()
export class CacheService {
  constructor(private redis: RedisService) {}

  // String operations
  await this.redis.set('key', 'value', 3600); // TTL in seconds
  const value = await this.redis.get('key');
  await this.redis.del('key');

  // JSON operations
  await this.redis.setJson('user:123', userData, 3600);
  const user = await this.redis.getJson<User>('user:123');

  // Locking
  const locked = await this.redis.setNx('lock:task:456', 'owner', 5000);
  if (locked) {
    // Do work...
    await this.redis.del('lock:task:456');
  }
}
```

### Queue Operations (Sorted Sets)

```typescript
// Add to queue with priority
await redis.zadd('queue:tasks', priority, taskId);

// Pop next item
const taskId = await redis.zpopmin('queue:tasks');

// Check queue size
const count = await redis.zcard('queue:tasks');

// Remove specific item
await redis.zrem('queue:tasks', taskId);
```

## 3. HealthModule - Health Checks

### Setup in App Module

```typescript
@Module({
  imports: [
    HealthModule.forRoot({
      serviceName: 'my-service',
      version: '1.0.0',
    }),
  ],
})
export class AppModule {}
```

### Endpoint

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "my-service",
  "version": "1.0.0",
  "timestamp": "2026-03-06T10:30:00.000Z"
}
```

## Environment Variables

```env
# Kafka
KAFKA_BROKERS=localhost:9092

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Common Patterns

### Pattern 1: Publish Event After Database Save

```typescript
async createTask(dto: CreateTaskDto) {
  const task = await this.taskRepo.save(dto);
  
  await this.kafka.publish('task.created', {
    id: task.id,
    projectId: task.projectId,
    timestamp: new Date().toISOString(),
  });
  
  return task;
}
```

### Pattern 2: Cache Database Query

```typescript
async getProject(id: string): Promise<Project> {
  const cached = await this.redis.getJson<Project>(`project:${id}`);
  if (cached) return cached;

  const project = await this.projectRepo.findOne({ where: { id } });
  await this.redis.setJson(`project:${id}`, project, 1800); // 30 min
  
  return project;
}
```

### Pattern 3: Distributed Queue Processing

```typescript
// Producer
async enqueueTask(taskId: string, priority: number) {
  await this.redis.zadd('queue:tasks', priority, taskId);
  await this.kafka.publish('task.queued', { taskId });
}

// Consumer
async processNextTask() {
  const taskId = await this.redis.zpopmin('queue:tasks');
  if (!taskId) return null;

  const lockKey = `lock:task:${taskId}`;
  const acquired = await this.redis.setNx(lockKey, 'processing', 60000);
  
  if (acquired) {
    try {
      await this.doWork(taskId);
      await this.kafka.publish('task.completed', { taskId });
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
```

## Tips

- **Kafka Topics**: Name with `noun.verb` pattern (e.g., `task.created`)
- **Redis Keys**: Use namespaces (e.g., `project:123`, `lock:task:456`)
- **TTL**: Always set TTL for cache to prevent memory leaks
- **Locking**: Keep lock TTL short, release explicitly in finally blocks
- **Error Handling**: Wrap Kafka/Redis calls in try-catch for resilience

## Documentation

- Full API: [libs/infrastructure/README.md](../../libs/infrastructure/README.md)
- Implementation: [SHARED_INFRASTRUCTURE_SUMMARY.md](../../SHARED_INFRASTRUCTURE_SUMMARY.md)
