# Environment-Aware Messaging Configuration Guide

## Overview
The Welo Platform now supports **configurable messaging middleware** that switches between:
- **Kafka** - Local/Docker development
- **AWS SNS/SQS** - Production deployment on AWS

## Architecture

### Abstraction Layer
All services use the `IMessagingService` interface, which provides:
- `publish(topic, message, options)` - Publish events
- `subscribe(topic, handler, options)` - Subscribe to events
- Domain-specific helpers: `publishTaskEvent`, `publishBatchEvent`, etc.

### Providers
1. **KafkaMessagingProvider** - Uses KafkaJS under the hood
2. **AwsMessagingProvider** - Uses AWS SDK v3 SNS + SQS

## Configuration

### Local/Docker (Kafka)
```bash
MESSAGING_PROVIDER=kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=my-service
KAFKA_CONSUMER_GROUP_ID=my-service-group
```

### Production (AWS)
```bash
MESSAGING_PROVIDER=aws
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
AWS_TOPIC_PREFIX=welo-prod
AWS_QUEUE_PREFIX=welo-prod
AWS_ENABLE_FIFO=false

# Optional: Provide credentials (or use IAM roles)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Service Integration

### Old Way (Direct Kafka Dependency)
```typescript
import { KafkaService } from '@app/infrastructure';

@Injectable()
export class TaskService {
  constructor(private kafkaService: KafkaService) {}

  async createTask(dto: CreateTaskDto) {
    // ...
    await this.kafkaService.publishTaskEvent('created', task);
  }
}
```

### New Way (Messaging Abstraction)
```typescript
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';
import { Inject } from '@nestjs/common';

@Injectable()
export class TaskService {
  constructor(
    @Inject(MESSAGING_SERVICE) private messagingService: IMessagingService,
  ) {}

  async createTask(dto: CreateTaskDto) {
    // ...
    await this.messagingService.publishTaskEvent('created', task);
  }
}
```

## Module Setup

### App Module
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingModule, MessagingConfig } from '@app/infrastructure';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    // Configure messaging based on environment
    MessagingModule.forRootAsync({
      useFactory: (configService: ConfigService): MessagingConfig => {
        const provider = configService.get<'kafka' | 'aws'>('MESSAGING_PROVIDER', 'kafka');

        return {
          provider,
          kafka: {
            clientId: configService.get('KAFKA_CLIENT_ID', 'welo-platform'),
            consumerGroupId: configService.get('KAFKA_CONSUMER_GROUP_ID', 'welo-group'),
            brokers: configService.get('KAFKA_BROKERS', 'localhost:9092').split(','),
            topics: ['task.created', 'task.updated', 'batch.created'],
          },
          aws: {
            region: configService.get('AWS_REGION', 'us-east-1'),
            accountId: configService.get('AWS_ACCOUNT_ID', ''),
            topicPrefix: configService.get('AWS_TOPIC_PREFIX', 'welo'),
            queuePrefix: configService.get('AWS_QUEUE_PREFIX', 'welo'),
            enableFifo: configService.get('AWS_ENABLE_FIFO', 'false') === 'true',
            ...(configService.get('AWS_ACCESS_KEY_ID') && {
              credentials: {
                accessKeyId: configService.get('AWS_ACCESS_KEY_ID')!,
                secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY')!,
              },
            }),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## AWS Infrastructure Setup

### Required AWS Resources

#### 1. SNS Topics
The provider auto-creates topics on-demand:
```
arn:aws:sns:us-east-1:123456789:welo-prod-task.created
arn:aws:sns:us-east-1:123456789:welo-prod-task.updated
arn:aws:sns:us-east-1:123456789:welo-prod-batch.created
```

#### 2. SQS Queues
Auto-created and subscribed to SNS topics:
```
https://sqs.us-east-1.amazonaws.com/123456789/welo-prod-task.created-queue
https://sqs.us-east-1.amazonaws.com/123456789/welo-prod-task.updated-queue
```

#### 3. IAM Permissions
Service role needs:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:CreateTopic",
        "sns:Publish",
        "sns:Subscribe",
        "sns:ListTopics"
      ],
      "Resource": "arn:aws:sns:us-east-1:123456789:welo-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:CreateQueue",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ReceiveMessage",
        "sqs:SetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:us-east-1:123456789:welo-*"
    }
  ]
}
```

## Traceability & Audit

### AWS Provider Features
1. **OpenTelemetry Integration**
   - Automatic trace context propagation
   - Span creation for publish/subscribe operations
   - Distributed tracing across services

2. **Structured Logging**
   - Every message includes: messageId, timestamp, correlationId, traceId
   - Audit logs for all publish/subscribe operations
   - Error tracking with stack traces

3. **Message Metadata**
   ```typescript
   {
     messageId: 'uuid-v4',
     timestamp: '2026-03-07T10:30:00Z',
     correlationId: 'request-correlation-id',
     traceId: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
     source: 'task-management-service',
     payload: { /* actual message */ }
   }
   ```

4. **SQS Visibility & Retry**
   - Failed messages remain in queue for retry
   - Configurable visibility timeout
   - Dead letter queue support (configure via AWS)

## Migration Strategy

### Phase 1: Backward Compatibility
- Keep `KafkaService` working for existing code
- New features use `IMessagingService`

### Phase 2: Gradual Migration
- Update services one by one to use `IMessagingService`
- Test both Kafka and AWS providers

### Phase 3: Complete Migration
- Remove direct `KafkaService` dependencies
- Deprecate `KafkaModule` in favor of `MessagingModule`

## Testing

### Local Testing (Kafka)
```bash
docker-compose up -d kafka
npm run start:dev
```

### AWS Testing (LocalStack)
```bash
docker-compose up -d localstack
export MESSAGING_PROVIDER=aws
export AWS_ENDPOINT_URL=http://localhost:4566
npm run start:dev
```

### Production
```bash
export MESSAGING_PROVIDER=aws
export AWS_REGION=us-east-1
npm run start:prod
```

## Troubleshooting

### Issue: Messages not received
**Kafka**: Check broker connectivity, topic existence
**AWS**: Check SNS topic subscription, SQS queue policy

### Issue: Duplicate messages
**Kafka**: Check consumer group ID, partition assignment
**AWS**: Enable FIFO queues with `AWS_ENABLE_FIFO=true`

### Issue: AWS authentication fails
**Solution**: Ensure IAM role attached to ECS task or provide credentials

## Performance Considerations

### Kafka
- Low latency (< 10ms)
- High throughput (100k+ msg/sec)
- Manual scaling required

### AWS SNS/SQS
- Moderate latency (50-200ms)
- Auto-scaling included
- Pay per request
- SQS long polling reduces costs

## References
- [AWS SNS Documentation](https://docs.aws.amazon.com/sns/)
- [AWS SQS Documentation](https://docs.aws.amazon.com/sqs/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [OpenTelemetry Tracing](https://opentelemetry.io/docs/instrumentation/js/getting-started/nodejs/)
