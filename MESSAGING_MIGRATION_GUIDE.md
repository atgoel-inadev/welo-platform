# Migration Guide: From KafkaService to Messaging Abstraction

## Overview
This guide shows how to migrate existing services from direct `KafkaService` dependency to the new environment-aware `IMessagingService` abstraction.

## What Changed?

### Before (Direct Kafka Dependency)
```typescript
import { KafkaService } from '@app/infrastructure';

@Injectable()
export class TaskService {
  constructor(private kafkaService: KafkaService) {}
  
  async createTask(dto: CreateTaskDto) {
    const task = await this.taskRepository.save(newTask);
    await this.kafkaService.publishTaskEvent('created', task);
    return task;
  }
}
```

### After (Messaging Abstraction)
```typescript
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';
import { Inject } from '@nestjs/common';

@Injectable()
export class TaskService {
  constructor(
    @Inject(MESSAGING_SERVICE) private messagingService: IMessagingService,
  ) {}
  
  async createTask(dto: CreateTaskDto) {
    const task = await this.taskRepository.save(newTask);
    await this.messagingService.publishTaskEvent('created', task);
    return task;
  }
}
```

## Step-by-Step Migration

### Step 1: Update Module Imports

#### From: app.module.ts (Old)
```typescript
import { Module } from '@nestjs/common';
import { KafkaModule } from '@app/infrastructure';

@Module({
  imports: [
    KafkaModule.forRoot({
      clientId: 'task-management',
      consumerGroupId: 'task-management-group',
      brokers: ['localhost:9092'],
      topics: ['task.created', 'task.updated'],
    }),
  ],
})
export class AppModule {}
```

#### To: app.module.ts (New)
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingModule, MessagingConfig } from '@app/infrastructure';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    MessagingModule.forRootAsync({
      useFactory: (configService: ConfigService): MessagingConfig => {
        const provider = configService.get<'kafka' | 'aws'>('MESSAGING_PROVIDER', 'kafka');

        return {
          provider,
          kafka: {
            clientId: configService.get('KAFKA_CLIENT_ID', 'task-management'),
            consumerGroupId: configService.get('KAFKA_CONSUMER_GROUP_ID', 'task-management-group'),
            brokers: configService.get('KAFKA_BROKERS', 'localhost:9092').split(','),
            topics: ['task.created', 'task.updated', 'task.assigned'],
          },
          aws: {
            region: configService.get('AWS_REGION', 'us-east-1'),
            accountId: configService.get('AWS_ACCOUNT_ID', ''),
            topicPrefix: configService.get('AWS_TOPIC_PREFIX', 'welo'),
            queuePrefix: configService.get('AWS_QUEUE_PREFIX', 'welo'),
            enableFifo: configService.get('AWS_ENABLE_FIFO', 'false') === 'true',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Step 2: Update Service Injection

#### Pattern 1: Publishing Events

**Before:**
```typescript
import { KafkaService } from '@app/infrastructure';

@Injectable()
export class TaskService {
  constructor(
    private taskRepository: Repository<Task>,
    private kafkaService: KafkaService,
  ) {}

  async updateTask(id: string, dto: UpdateTaskDto) {
    const task = await this.taskRepository.save(updatedTask);
    await this.kafkaService.publishTaskEvent('updated', task);
    return task;
  }
}
```

**After:**
```typescript
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';
import { Inject } from '@nestjs/common';

@Injectable()
export class TaskService {
  constructor(
    private taskRepository: Repository<Task>,
    @Inject(MESSAGING_SERVICE) private messagingService: IMessagingService,
  ) {}

  async updateTask(id: string, dto: UpdateTaskDto) {
    const task = await this.taskRepository.save(updatedTask);
    await this.messagingService.publishTaskEvent('updated', task);
    return task;
  }
}
```

#### Pattern 2: Subscribing to Events

**Before:**
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { KafkaService } from '@app/infrastructure';

@Injectable()
export class WorkflowEventHandler implements OnModuleInit {
  constructor(private kafkaService: KafkaService) {}

  async onModuleInit() {
    await this.kafkaService.subscribe('annotation.submitted', async (payload) => {
      const message = JSON.parse(payload.message.value.toString());
      await this.handleAnnotationSubmitted(message);
    });
  }
}
```

**After:**
```typescript
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { IMessagingService, MESSAGING_SERVICE, MessagePayload } from '@app/infrastructure';

@Injectable()
export class WorkflowEventHandler implements OnModuleInit {
  constructor(
    @Inject(MESSAGING_SERVICE) private messagingService: IMessagingService,
  ) {}

  async onModuleInit() {
    await this.messagingService.subscribe(
      'annotation.submitted',
      async (payload: MessagePayload) => {
        await this.handleAnnotationSubmitted(payload.value);
      },
    );
  }
}
```

#### Pattern 3: Advanced Publishing with Correlation

**Before:**
```typescript
async processTask(taskId: string) {
  await this.kafkaService.publishEvent(
    'task.processing',
    { taskId },
    'task-service',
    correlationId,
  );
}
```

**After:**
```typescript
async processTask(taskId: string, correlationId: string) {
  await this.messagingService.publishEvent(
    'task.processing',
    { taskId },
    'task-service',
    correlationId,
  );
}
```

### Step 3: Update Unit Tests

**Before:**
```typescript
import { KafkaService } from '@app/infrastructure';

describe('TaskService', () => {
  let service: TaskService;
  let kafkaService: KafkaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: KafkaService,
          useValue: {
            publishTaskEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  it('should publish event on task creation', async () => {
    await service.createTask(dto);
    expect(kafkaService.publishTaskEvent).toHaveBeenCalledWith('created', expect.any(Object));
  });
});
```

**After:**
```typescript
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';

describe('TaskService', () => {
  let service: TaskService;
  let messagingService: IMessagingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: MESSAGING_SERVICE,
          useValue: {
            publishTaskEvent: jest.fn(),
            publishEvent: jest.fn(),
            subscribe: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    messagingService = module.get<IMessagingService>(MESSAGING_SERVICE);
  });

  it('should publish event on task creation', async () => {
    await service.createTask(dto);
    expect(messagingService.publishTaskEvent).toHaveBeenCalledWith('created', expect.any(Object));
  });
});
```

## Services to Migrate

### High Priority
1. ✅ **task-management** - Heavy event publishing
2. ✅ **project-management** - Batch and task events
3. ✅ **workflow-engine** - State transitions
4. ✅ **annotation-qa-service** - Quality checks

### Medium Priority
5. **notification-service** - Notification events
6. **export-service** - Export completion events
7. **audit-service** - Audit log events

## API Compatibility Matrix

All methods from `KafkaService` are available in `IMessagingService`:

| Method | KafkaService | IMessagingService | Notes |
|--------|--------------|-------------------|-------|
| `publish(topic, message)` | ✅ | ✅ | Same interface |
| `subscribe(topic, handler)` | ✅ | ✅ | Handler signature changed |
| `publishTaskEvent(event, task)` | ✅ | ✅ | Same interface |
| `publishBatchEvent(event, batch)` | ✅ | ✅ | Same interface |
| `publishAssignmentEvent(event, assignment)` | ✅ | ✅ | Same interface |
| `publishAnnotationEvent(annotation)` | ✅ | ✅ | Same interface |
| `publishQualityCheckRequest(task)` | ✅ | ✅ | Same interface |
| `publishNotification(notification)` | ✅ | ✅ | Same interface |
| `publishEvent(topic, payload, source, correlationId)` | ✅ | ✅ | Same interface |

### Handler Signature Change

**Before (Kafka-specific):**
```typescript
await kafkaService.subscribe('topic', async (payload: EachMessagePayload) => {
  const message = JSON.parse(payload.message.value.toString());
  // Process message
});
```

**After (Provider-agnostic):**
```typescript
await messagingService.subscribe('topic', async (payload: MessagePayload) => {
  const message = payload.value; // Already parsed
  const metadata = payload.metadata; // Contains messageId, timestamp, correlationId, traceId
  // Process message
});
```

## Testing Strategy

### 1. Local Testing (Kafka)
```bash
# Use Kafka for local development
export MESSAGING_PROVIDER=kafka
docker-compose up -d kafka
npm run start:dev
```

### 2. AWS Testing (LocalStack)
```bash
# Test AWS provider locally with LocalStack
export MESSAGING_PROVIDER=aws
export AWS_ENDPOINT_URL=http://localhost:4566
docker-compose up -d localstack
npm run start:dev
```

### 3. Production Deployment
```bash
# AWS environment
export MESSAGING_PROVIDER=aws
export AWS_REGION=us-east-1
# IAM role provides credentials automatically
npm run start:prod
```

## Rollback Strategy

If issues arise, you can instantly rollback to Kafka:

1. **Environment Variable Change:**
   ```bash
   export MESSAGING_PROVIDER=kafka
   ```

2. **Service Restart:**
   ```bash
   docker-compose restart <service-name>
   ```

No code changes required - the factory handles provider selection.

## Common Pitfalls

### ❌ Wrong: Direct import of KafkaService
```typescript
import { KafkaService } from '@app/infrastructure';
constructor(private kafka: KafkaService) {}
```

### ✅ Correct: Use abstraction with injection token
```typescript
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';
constructor(@Inject(MESSAGING_SERVICE) private messaging: IMessagingService) {}
```

### ❌ Wrong: Parsing message in subscriber
```typescript
await messagingService.subscribe('topic', async (payload) => {
  const message = JSON.parse(payload.message.value.toString()); // ❌
});
```

### ✅ Correct: Use parsed value
```typescript
await messagingService.subscribe('topic', async (payload: MessagePayload) => {
  const message = payload.value; // ✅ Already parsed
});
```

## Benefits

1. **Environment Flexibility** - Switch providers via config
2. **Cost Optimization** - Use Kafka locally, AWS SNS/SQS in production
3. **Traceability** - Built-in OpenTelemetry support
4. **Testability** - Mock single interface instead of Kafka-specific APIs
5. **Future-Proofing** - Easy to add new providers (Azure Service Bus, RabbitMQ, etc.)

## Support

For questions or issues:
- See [MESSAGING_CONFIGURATION.md](MESSAGING_CONFIGURATION.md)
- Check logs: `docker-compose logs -f <service-name>`
- Test connectivity: Check service health endpoints
