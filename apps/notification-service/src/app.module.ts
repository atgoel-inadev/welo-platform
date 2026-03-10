import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule, RedisModule, HealthModule } from '@app/infrastructure';
import { Notification, User } from '@app/common';
import { Webhook } from './webhook/webhook.entity';
import { WebhookDelivery } from './webhook/webhook-delivery.entity';
import { NotificationModule } from './notification/notification.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'welo_platform'),
        entities: [
          Notification,
          User,
          Webhook,
          WebhookDelivery,
        ],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        extra: {
          max: configService.get<number>('DB_POOL_SIZE', 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
        },
      }),
      inject: [ConfigService],
    }),
    MessagingModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        provider: configService.get('MESSAGING_PROVIDER', 'kafka') as 'kafka' | 'aws',
        kafka: {
          clientId: 'notification-service',
          consumerGroupId: 'notification-group',
          topics: [
            'notification.send',
            'task.assigned',
            'task.completed',
            'assignment.expired',
            'batch.completed',
            'export.completed',
            'quality_check.failed',
          ],
        },
        aws: {
          region: configService.get('AWS_REGION', 'us-east-1'),
          topics: [
            'notification.send',
            'task.assigned',
            'task.completed',
            'assignment.expired',
            'batch.completed',
            'export.completed',
            'quality_check.failed',
          ],
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    NotificationModule,
    WebhookModule,
    HealthModule.forRoot({ serviceName: 'notification-service', version: '1.0.0' }),
  ],
})
export class AppModule {}
