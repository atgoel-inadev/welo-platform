import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Workflow,
  WorkflowInstance,
  StateTransition,
  Task,
  Batch,
  Project,
  Customer,
  User,
  Assignment,
  Annotation,
  AnnotationVersion,
  AnnotationResponse,
  QualityCheck,
  QualityRule,
  ReviewApproval,
  GoldTask,
  Queue,
  Export,
  AuditLog,
  Notification,
  Comment,
  Template,
  ProjectTeamMember,
} from '@app/common';
import { MessagingModule, HealthModule } from '@app/infrastructure';
import { AnnotationModule } from './annotation/annotation.module';
import { GoldTaskModule } from './gold-task/gold-task.module';
import { QualityCheckModule } from './quality-check/quality-check.module';
import { ReviewModule } from './review/review.module';
import { StateManagementModule } from './state-management/state-management.module';

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
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'welo_platform'),
        entities: [
          Workflow,
          WorkflowInstance,
          StateTransition,
          Task,
          Batch,
          Project,
          Customer,
          User,
          Assignment,
          Annotation,
          AnnotationVersion,
          AnnotationResponse,
          QualityCheck,
          QualityRule,
          ReviewApproval,
          GoldTask,
          Queue,
          Export,
          AuditLog,
          Notification,
          Comment,
          Template,
          ProjectTeamMember,
        ],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        extra: {
          max: configService.get<number>('DB_POOL_SIZE', 15),
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
          clientId: 'annotation-qa-service',
          consumerGroupId: 'annotation-qa-service-group',
          topics: [
            'annotation.submitted',
            'annotation.updated',
            'annotation.draft_saved',
            'gold_comparison.completed',
            'auto_qc.passed',
            'auto_qc.failed',
            'review.submitted',
            'task.approved',
            'task.rejected_to_queue',
            'task.escalated',
            'quality_check.completed',
            'task.assigned',
            'task.state_changed',
            'notification.send',
          ],
        },
        aws: {
          region: configService.get('AWS_REGION', 'us-east-1'),
          topics: [
            'annotation.submitted',
            'annotation.updated',
            'annotation.draft_saved',
            'gold_comparison.completed',
            'auto_qc.passed',
            'auto_qc.failed',
            'review.submitted',
            'task.approved',
            'task.rejected_to_queue',
            'task.escalated',
            'quality_check.completed',
            'task.assigned',
            'task.state_changed',
            'notification.send',
          ],
        },
      }),
      inject: [ConfigService],
    }),
    AnnotationModule,
    GoldTaskModule,
    QualityCheckModule,
    ReviewModule,
    StateManagementModule,
    HealthModule.forRoot({ serviceName: 'annotation-qa-service', version: '1.0.0' }),
    TypeOrmModule.forFeature([AuditLog]),
  ],
  controllers: [],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
