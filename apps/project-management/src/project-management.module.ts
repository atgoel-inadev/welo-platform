import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule, RedisModule, HealthModule } from '@app/infrastructure';
import { AuditInterceptor } from '@app/common';
import { ProjectController } from './controllers/project.controller';
import { BatchController } from './controllers/batch.controller';
import { CustomerController } from './controllers/customer.controller';
import { UIConfigurationController } from './controllers/ui-configuration.controller';
import { MediaController } from './controllers/media.controller';
import { QueueController } from './controllers/queue.controller';
import { ProjectService } from './services/project.service';
import { WorkflowConfigService } from './services/workflow-config.service';
import { AnnotationQuestionService } from './services/annotation-question.service';
import { UIConfigurationService } from './services/ui-configuration.service';
import { BatchService } from './services/batch.service';
import { CustomerService } from './services/customer.service';
import { ProjectTeamService } from './services/project-team.service';
import { PluginService } from './services/plugin.service';
import { SecretService } from './services/secret.service';
import { QueueService } from './services/queue.service';
import {
  Project,
  Customer,
  User,
  Workflow,
  WorkflowInstance,
  StateTransition,
  Task,
  Assignment,
  Annotation,
  AnnotationResponse,
  ReviewApproval,
  QualityCheck,
  Batch,
  Queue,
  Export,
  AuditLog,
  Notification,
  Comment,
  Template,
  ProjectTeamMember,
  PluginSecret,
  PluginExecutionLog,
} from '@app/common/entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'welo',
      entities: [
        Project,
        Customer,
        User,
        Workflow,
        WorkflowInstance,
        StateTransition,
        Task,
        Assignment,
        Annotation,
        AnnotationResponse,
        ReviewApproval,
        QualityCheck,
        Batch,
        Queue,
        Export,
        AuditLog,
        Notification,
        Comment,
        Template,
        ProjectTeamMember,
        PluginSecret,
        PluginExecutionLog,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      extra: {
        max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
      },
    }),
    TypeOrmModule.forFeature([
      Project,
      Customer,
      User,
      Workflow,
      Task,
      Assignment,
      ReviewApproval,
      AnnotationResponse,
      Batch,
      AuditLog,
      ProjectTeamMember,
      PluginSecret,
      PluginExecutionLog,
      Queue,
    ]),
    KafkaModule.forRoot({
      clientId: 'project-management-service',
      consumerGroupId: 'project-management-group',
      topics: [
        'batch.created',
        'batch.updated',
        'batch.completed',
        'task.created',
        'task.assigned',
        'task.updated',
        'task.completed',
        'assignment.created',
        'assignment.expired',
        'notification.send',
      ],
    }),
    RedisModule,
    HealthModule.forRoot({ serviceName: 'project-management', version: '1.0.0' }),
  ],
  controllers: [ProjectController, BatchController, CustomerController, UIConfigurationController, MediaController, QueueController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    ProjectService, WorkflowConfigService, AnnotationQuestionService, UIConfigurationService,
    BatchService, CustomerService, ProjectTeamService, PluginService, SecretService, QueueService,
  ],
})
export class ProjectManagementModule {}
