import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule, RedisModule, HealthModule } from '@app/infrastructure';
import {
  Task,
  Batch,
  Project,
  Assignment,
  Annotation,
  QualityCheck,
  StateTransition,
  User,
  ProjectTeamMember,
} from '@app/common';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProductivityModule } from './productivity/productivity.module';
import { QualityModule } from './quality/quality.module';
import { ProjectAnalyticsModule } from './project/project-analytics.module';
import { AnalyticsEventsModule } from './events/analytics-events.module';

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
        // In production: point to read replica via ANALYTICS_DB_HOST
        host: configService.get('ANALYTICS_DB_HOST', configService.get('DATABASE_HOST', 'localhost')),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'welo_platform'),
        entities: [
          Task,
          Batch,
          Project,
          Assignment,
          Annotation,
          QualityCheck,
          StateTransition,
          User,
          ProjectTeamMember,
        ],
        synchronize: false, // analytics is read-only — never migrates
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
          clientId: 'analytics-service',
          consumerGroupId: 'analytics-group',
          topics: [
            'task.completed',
            'batch.completed',
            'quality_check.completed',
          ],
        },
        aws: {
          region: configService.get('AWS_REGION', 'us-east-1'),
          topics: [
            'task.completed',
            'batch.completed',
            'quality_check.completed',
          ],
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    DashboardModule,
    ProductivityModule,
    QualityModule,
    ProjectAnalyticsModule,
    AnalyticsEventsModule,
    HealthModule.forRoot({ serviceName: 'analytics-service', version: '1.0.0' }),
  ],
})
export class AppModule {}
