import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule, RedisModule, HealthModule } from '@app/infrastructure';
import {
  AuditLog,
  User,
  Task,
  Batch,
  Project,
  Assignment,
  Annotation,
  QualityCheck,
  Export,
} from '@app/common';
import { AuditModule } from './audit/audit.module';
import { ComplianceModule } from './compliance/compliance.module';

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
          AuditLog,
          User,
          Task,
          Batch,
          Project,
          Assignment,
          Annotation,
          QualityCheck,
          Export,
        ],
        synchronize: false, // audit service never migrates — schema owned by other services
        logging: configService.get('NODE_ENV') === 'development',
        extra: {
          max: configService.get<number>('DB_POOL_SIZE', 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
        },
      }),
      inject: [ConfigService],
    }),
    KafkaModule.forRoot({
      clientId: 'audit-service',
      consumerGroupId: 'audit-group',
      topics: [
        'task.created',
        'task.assigned',
        'task.updated',
        'task.completed',
        'task.submitted',
        'task.state_changed',
        'batch.created',
        'batch.updated',
        'batch.completed',
        'annotation.submitted',
        'annotation.updated',
        'quality_check.completed',
        'export.completed',
        'user.registered',
        'user.logged_in',
        'assignment.created',
        'assignment.expired',
      ],
    }),
    RedisModule,
    AuditModule,
    ComplianceModule,
    HealthModule.forRoot({ serviceName: 'audit-service', version: '1.0.0' }),
    TypeOrmModule.forFeature([AuditLog]), // required by AuditInterceptor in this service
  ],
  providers: [
    // Audit the audit-service's own HTTP endpoints (GDPR erasure, compliance reports)
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
