import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditInterceptor } from '@app/common';
import { TaskController } from './task/task.controller';
import { TaskService } from './task/task.service';
import { TaskRenderingService } from './services/task-rendering.service';
import { StageAssignmentService } from './services/stage-assignment.service';
import { WorkflowProgressionService } from './services/workflow-progression.service';
import { TaskAssignmentEventHandler } from './services/task-assignment-event.handler';
import { PluginRunnerService } from './services/plugin-runner.service';
import { CommentService } from './services/comment.service';
import { TaskQueueService } from './services/task-queue.service';
import { AssignmentLockService } from './services/assignment-lock.service';
import { KafkaModule, RedisModule, HealthModule } from '@app/infrastructure';
import {
  Workflow,
  WorkflowInstance,
  StateTransition,
  Task,
  Batch,
  Project,
  ProjectTeamMember,
  Customer,
  User,
  Assignment,
  Annotation,
  AnnotationResponse,
  QualityCheck,
  ReviewApproval,
  Queue,
  Export,
  AuditLog,
  Notification,
  Comment,
  Template,
  PluginSecret,
  PluginExecutionLog,
} from '@app/common';

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
          Workflow,
          WorkflowInstance,
          StateTransition,
          Task,
          Batch,
          Project,
          ProjectTeamMember,
          Customer,
          User,
          Assignment,
          Annotation,
          AnnotationResponse,
          QualityCheck,
          ReviewApproval,
          Queue,
          Export,
          AuditLog,
          Notification,
          Comment,
          Template,
          PluginSecret,
          PluginExecutionLog,
        ],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        extra: {
          max: configService.get<number>('DB_POOL_SIZE', 20),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      Task,
      Assignment,
      Annotation,
      AnnotationResponse,
      ReviewApproval,
      Project,
      ProjectTeamMember,
      Batch,
      Workflow,
      User,
      Queue,
      Comment,
      AuditLog,
      PluginSecret,
      PluginExecutionLog,
    ]),
    KafkaModule.forRoot({
      clientId: 'task-management-service',
      consumerGroupId: 'task-management-group',
      topics: [
        'task.created',
        'task.updated',
        'task.assigned',
        'task.completed',
        'task.submitted',
        'task.state_changed',
        'annotation.submitted',
        'quality_check.requested',
        'notification.send',
        'state.transitioned', // Workflow Engine event
      ],
    }),
    RedisModule,
    HealthModule.forRoot({ serviceName: 'task-management', version: '1.0.0' }),
  ],
  controllers: [TaskController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    TaskService,
    TaskRenderingService,
    StageAssignmentService,
    TaskAssignmentEventHandler,
    WorkflowProgressionService,
    PluginRunnerService,
    CommentService,
    TaskQueueService,
    AssignmentLockService,
  ],
})
export class AppModule {}
