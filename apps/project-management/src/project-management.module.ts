import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './controllers/project.controller';
import { BatchController } from './controllers/batch.controller';
import { CustomerController } from './controllers/customer.controller';
import { UIConfigurationController } from './controllers/ui-configuration.controller';
import { HealthController } from './controllers/health.controller';
import { MediaController } from './controllers/media.controller';
import { ProjectService } from './services/project.service';
import { WorkflowConfigService } from './services/workflow-config.service';
import { AnnotationQuestionService } from './services/annotation-question.service';
import { UIConfigurationService } from './services/ui-configuration.service';
import { BatchService } from './services/batch.service';
import { CustomerService } from './services/customer.service';
import { ProjectTeamService } from './services/project-team.service';
import { KafkaModule } from './kafka/kafka.module';
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
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
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
      ProjectTeamMember,
    ]),
    KafkaModule,
  ],
  controllers: [ProjectController, BatchController, CustomerController, UIConfigurationController, HealthController, MediaController],
  providers: [ProjectService, WorkflowConfigService, AnnotationQuestionService, UIConfigurationService, BatchService, CustomerService, ProjectTeamService],
})
export class ProjectManagementModule {}
