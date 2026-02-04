import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './controllers/project.controller';
import { BatchController } from './controllers/batch.controller';
import { CustomerController } from './controllers/customer.controller';
import { ProjectService } from './services/project.service';
import { WorkflowConfigService } from './services/workflow-config.service';
import { AnnotationQuestionService } from './services/annotation-question.service';
import { BatchService } from './services/batch.service';
import { CustomerService } from './services/customer.service';
import { KafkaModule } from './kafka/kafka.module';
import {
  Project,
  Customer,
  User,
  Workflow,
  Task,
  Assignment,
  ReviewApproval,
  AnnotationResponse,
  Batch,
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
        Task,
        Assignment,
        ReviewApproval,
        AnnotationResponse,
        Batch,
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
    ]),
    KafkaModule,
  ],
  controllers: [ProjectController, BatchController, CustomerController],
  providers: [ProjectService, WorkflowConfigService, AnnotationQuestionService, BatchService, CustomerService],
})
export class ProjectManagementModule {}
