# Welo Platform Infrastructure Library

## Overview

The `@app/infrastructure` library provides shared infrastructure modules that are used across all Welo Platform microservices. This library eliminates code duplication and ensures consistent infrastructure patterns throughout the platform.

## Modules

### 1. KafkaModule

A configurable Kafka module that handles event-driven communication between services.

#### Features
- Automatic producer, consumer, and admin client setup
- Topic auto-creation with configurable partitions and replication
- Connection retry logic
- Type-safe message publishing
- Flexible subscription patterns

#### Usage

```typescript
import { KafkaModule } from '@app/infrastructure';

@Module({
  imports: [
    KafkaModule.forRoot({
      clientId: 'my-service',
      consumerGroupId: 'my-service-group',
      topics: [
        'task.created',
        'task.updated',
        'annotation.submitted',
      ],
    }),
  ],
})
export class MyModule {}
```

#### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `clientId` | string | Yes | Unique identifier for the Kafka client |
| `consumerGroupId` | string | Yes | Consumer group ID for this service |
| `brokers` | string[] | No | Kafka broker addresses (defaults to env `KAFKA_BROKERS`) |
| `topics` | string[] | No | Topics to create on initialization |

#### Publishing Messages

```typescript
import { KafkaService } from '@app/infrastructure';

@Injectable()
export class MyService {
  constructor(private kafkaService: KafkaService) {}

  async createTask(task: Task) {
    // ... business logic ...
    
    await this.kafkaService.publish('task.created', {
      id: task.id,
      projectId: task.projectId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### Subscribing to Messages

```typescript
import { KafkaService } from '@app/infrastructure';
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class MyEventHandler implements OnModuleInit {
  constructor(private kafkaService: KafkaService) {}

  async onModuleInit() {
    await this.kafkaService.subscribe('task.created', async (payload) => {
      const message = JSON.parse(payload.message.value.toString());
      console.log('Received task.created event:', message);
      // Handle the event
    });
  }
}
```

### 2. RedisModule

A global Redis module that provides caching, session storage, and distributed locking capabilities.

#### Features
- Connection management with automatic retry
- Basic key-value operations
- JSON serialization/deserialization helpers
- Sorted set operations for queuing
- Hash, List, and Set operations
- Pub/Sub support
- Distributed locking with `setNx`

#### Usage

```typescript
import { RedisModule } from '@app/infrastructure';

@Module({
  imports: [
    RedisModule, // No configuration needed - uses environment variables
  ],
})
export class MyModule {}
```

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | localhost | Redis server hostname |
| `REDIS_PORT` | 6379 | Redis server port |
| `REDIS_PASSWORD` | (none) | Redis authentication password |

#### Common Operations

```typescript
import { RedisService } from '@app/infrastructure';

@Injectable()
export class CacheService {
  constructor(private redisService: RedisService) {}

  // Basic key-value operations
  async cacheUser(userId: string, user: User) {
    await this.redisService.setJson(`user:${userId}`, user, 3600); // TTL: 1 hour
  }

  async getCachedUser(userId: string): Promise<User | null> {
    return this.redisService.getJson<User>(`user:${userId}`);
  }

  // Distributed locking
  async acquireLock(taskId: string): Promise<boolean> {
    return this.redisService.setNx(
      `lock:task:${taskId}`,
      'locked',
      5000 // 5 seconds TTL
    );
  }

  // Queue operations with sorted sets
  async addToQueue(taskId: string, priority: number) {
    await this.redisService.zadd('task:queue', priority, taskId);
  }

  async getNextTask(): Promise<string | null> {
    return this.redisService.zpopmin('task:queue');
  }
}
```

### 3. HealthModule

A reusable health check module that provides a standardized health endpoint for all services.

#### Features
- Configurable service name and version
- Swagger/OpenAPI documentation
- Consistent response format across all services

#### Usage

```typescript
import { HealthModule } from '@app/infrastructure';

@Module({
  imports: [
    HealthModule.forRoot({
      serviceName: 'my-service',
      version: '1.0.0',
    }),
  ],
})
export class MyModule {}
```

#### Endpoint

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

## Import Path

All modules and services are exported from the main barrel file:

```typescript
import {
  KafkaModule,
  KafkaService,
  RedisModule,
  RedisService,
  HealthModule,
  HealthController,
} from '@app/infrastructure';
```

## Architecture Principles

### 1. Global Modules
- `KafkaModule` and `RedisModule` are marked as `@Global()` to avoid re-importing in every module
- `HealthModule` is not global - it's imported once per application

### 2. Dynamic Configuration
- `KafkaModule.forRoot()` accepts service-specific configuration
- `HealthModule.forRoot()` accepts service name and version
- `RedisModule` uses environment variables for configuration

### 3. Type Safety
- All interfaces are exported (`KafkaModuleOptions`, `HealthModuleOptions`)
- TypeScript generics used where appropriate (e.g., `getJson<T>`)

### 4. Dependency Injection
- All services use NestJS DI patterns
- Configuration injected via `@Inject('OPTIONS_TOKEN')`

## Service-Specific Topics

Each service configures its own Kafka topics when registering the module:

| Service | Topics |
|---------|--------|
| **task-management** | task.created, task.updated, task.assigned, task.completed, task.submitted, task.state_changed, annotation.submitted, quality_check.requested, notification.send |
| **project-management** | batch.created, batch.updated, batch.completed, task.created, task.assigned, task.updated, task.completed, assignment.created, assignment.expired, notification.send |
| **annotation-qa-service** | annotation.submitted, annotation.updated, annotation.draft_saved, gold_comparison.completed, auto_qc.passed, auto_qc.failed, review.submitted, task.approved, task.rejected_to_queue, task.escalated, quality_check.completed, task.assigned, task.state_changed, notification.send |

## Benefits of Shared Infrastructure

### ✅ Code Reuse
- Single implementation of Kafka, Redis, and Health modules
- Eliminates ~300+ lines of duplicate code per service

### ✅ Consistency
- All services use the same infrastructure patterns
- Unified error handling and logging
- Standardized health check responses

### ✅ Maintainability
- Fix bugs once, deploy everywhere
- Easy to add new features (e.g., Kafka metrics)
- Clear separation of concerns

### ✅ Type Safety
- Shared TypeScript interfaces
- Compile-time verification of configuration

### ✅ Testability
- Mock infrastructure services consistently across all apps
- Shared test utilities (future enhancement)

## Migration Notes

### Removed Local Modules

The following local modules have been removed from individual services:

- `apps/*/src/kafka/` → `@app/infrastructure/kafka`
- `apps/*/src/redis/` → `@app/infrastructure/redis`
- `apps/*/src/health/health.controller.ts` → `@app/infrastructure/health`

### Breaking Changes

None - the API surface is identical to the previous local implementations.

## Future Enhancements

Potential additions to the infrastructure library:

- [ ] Database module with TypeORM base repository
- [ ] Logging module with structured logging
- [ ] Metrics module (Prometheus integration)
- [ ] Tracing module (OpenTelemetry integration)
- [ ] Email/notification module
- [ ] File storage module (S3/MinIO abstraction)

## Development

### Building the Library

```bash
# Build the infrastructure library
npm run build infrastructure
```

### Adding New Infrastructure Modules

1. Create module folder in `libs/infrastructure/src/`
2. Implement module, service, and interfaces
3. Export in `libs/infrastructure/src/index.ts`
4. Update this README
5. Import in services as needed

### Testing

```bash
# Run tests for the infrastructure library
npm test -- infrastructure
```

## Related Documentation

- [DEVELOPMENT_WORKFLOW.md](../../DEVELOPMENT_WORKFLOW.md) - Development best practices
- [DOCKER_BUILD_GUIDE.md](../../DOCKER_BUILD_GUIDE.md) - Docker service management
- [WORKFLOW_CHEAT_SHEET.md](../../WORKFLOW_CHEAT_SHEET.md) - Quick reference guide

## Support

For questions or issues with the infrastructure library, consult:
- Project architecture documentation
- GitHub Copilot instructions (`.github/copilot-instructions.md`)
- Team lead or senior engineers
