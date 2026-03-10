# Quick Start: Environment-Aware Messaging

## What Was Done
✅ Implemented configurable messaging middleware supporting:
- **Kafka** (local/Docker)
- **AWS SNS/SQS** (production)
- Full OpenTelemetry traceability
- Event-driven architecture with audit logging

## Installation

### 1. Install Dependencies
```bash
cd welo-platform
npm install
```

This installs:
- `@aws-sdk/client-sns@^3.540.0`
- `@aws-sdk/client-sqs@^3.540.0`

### 2. Configure Environment
```bash
# Local Development (Kafka)
cp .env.example .env

# Edit .env and ensure:
MESSAGING_PROVIDER=kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=welo-platform
KAFKA_CONSUMER_GROUP_ID=welo-platform-group
```

### 3. Start Infrastructure
```bash
# Start Kafka for local development
docker-compose up -d kafka

# Verify Kafka is running
docker-compose logs kafka
```

### 4. Test the Implementation
```bash
# Start any service (e.g., task-management)
npm run start:task-management

# Check logs for messaging initialization
# You should see: "Kafka producer connected"
```

## Usage Examples

### Import the Messaging Service
```typescript
import { IMessagingService, MESSAGING_SERVICE } from '@app/infrastructure';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class YourService {
  constructor(
    @Inject(MESSAGING_SERVICE) 
    private messagingService: IMessagingService,
  ) {}

  async doSomething() {
    // Publish event
    await this.messagingService.publishTaskEvent('created', task);
    
    // Subscribe to events
    await this.messagingService.subscribe('topic', async (payload) => {
      console.log(payload.value); // Already parsed JSON
    });
  }
}
```

### Configure Module
```typescript
import { MessagingModule, MessagingConfig } from '@app/infrastructure';

@Module({
  imports: [
    MessagingModule.forRootAsync({
      useFactory: (configService: ConfigService): MessagingConfig => ({
        provider: configService.get('MESSAGING_PROVIDER', 'kafka'),
        kafka: {
          clientId: 'my-service',
          consumerGroupId: 'my-group',
          brokers: configService.get('KAFKA_BROKERS', 'localhost:9092').split(','),
        },
        aws: {
          region: configService.get('AWS_REGION', 'us-east-1'),
          accountId: configService.get('AWS_ACCOUNT_ID', ''),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Switch to AWS (Production)

### 1. Update Environment Variables
```bash
MESSAGING_PROVIDER=aws
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
AWS_TOPIC_PREFIX=welo-prod
AWS_QUEUE_PREFIX=welo-prod

# Optional: Provide credentials (or use IAM role)
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
```

### 2. Restart Services
```bash
docker-compose restart task-management
```

### 3. Verify AWS Resources
- SNS Topics: `welo-prod-task.created`
- SQS Queues: `welo-prod-task.created-queue`

## Testing

### Test Kafka Locally
```bash
# Terminal 1: Start Kafka
docker-compose up kafka

# Terminal 2: Start service
MESSAGING_PROVIDER=kafka npm run start:task-management

# Terminal 3: Check Kafka topics
docker exec -it welo-platform-kafka-1 kafka-topics.sh --list --bootstrap-server localhost:9092
```

### Test AWS with LocalStack
```bash
# Terminal 1: Start LocalStack
docker-compose up localstack

# Terminal 2: Start service with AWS provider
MESSAGING_PROVIDER=aws \
AWS_ENDPOINT_URL=http://localhost:4566 \
npm run start:task-management
```

## Backward Compatibility

**The existing `KafkaService` still works!**

Services using `KafkaService` directly will continue to function. However, new code should use `IMessagingService` for environment flexibility.

## Migration Checklist

To migrate existing services:

- [ ] Update imports from `KafkaService` to `IMessagingService`
- [ ] Change injection from `private kafkaService: KafkaService` to `@Inject(MESSAGING_SERVICE) private messagingService: IMessagingService`
- [ ] Replace `KafkaModule.forRoot()` with `MessagingModule.forRootAsync()`
- [ ] Update subscriber handlers from `EachMessagePayload` to `MessagePayload`
- [ ] Test with both `MESSAGING_PROVIDER=kafka` and `MESSAGING_PROVIDER=aws`

See [MESSAGING_MIGRATION_GUIDE.md](MESSAGING_MIGRATION_GUIDE.md) for detailed steps.

## Documentation

- **Configuration Guide**: [MESSAGING_CONFIGURATION.md](MESSAGING_CONFIGURATION.md)
- **Migration Guide**: [MESSAGING_MIGRATION_GUIDE.md](MESSAGING_MIGRATION_GUIDE.md)
- **Implementation Summary**: [MESSAGING_IMPLEMENTATION_SUMMARY.md](MESSAGING_IMPLEMENTATION_SUMMARY.md)

## Troubleshooting

### "Cannot find module '@aws-sdk/client-sns'"
Run `npm install` to install AWS SDK dependencies.

### "Kafka not connected"
Ensure Kafka is running: `docker-compose up -d kafka`
Check docker logs: `docker-compose logs kafka`

### AWS connection fails
- Verify AWS credentials
- Check IAM permissions
- Confirm region and account ID

## Support

For issues or questions:
1. Check the documentation files listed above
2. Review service logs: `docker-compose logs -f <service-name>`
3. Verify environment variables are set correctly
4. Test connectivity to Kafka/AWS

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure environment: Update `.env`
3. ✅ Start infrastructure: `docker-compose up -d kafka`
4. ✅ Test locally: `npm run start:dev`
5. 📋 Migrate services: Follow migration guide
6. 🚀 Deploy to AWS: Update environment variables and deploy
