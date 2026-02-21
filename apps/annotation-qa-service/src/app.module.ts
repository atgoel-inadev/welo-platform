import { Module } from '@nestjs/common';
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
import { KafkaModule } from './kafka/kafka.module';
import { AnnotationModule } from './annotation/annotation.module';
import { GoldTaskModule } from './gold-task/gold-task.module';
import { QualityCheckModule } from './quality-check/quality-check.module';
import { ReviewModule } from './review/review.module';
import { StateManagementModule } from './state-management/state-management.module';
import { HealthController } from './health/health.controller';

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
      }),
      inject: [ConfigService],
    }),
    KafkaModule,
    AnnotationModule,
    GoldTaskModule,
    QualityCheckModule,
    ReviewModule,
    StateManagementModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
