import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskController } from './task/task.controller';
import { TaskService } from './task/task.service';
import { BatchController } from './batch/batch.controller';
import { KafkaModule } from './kafka/kafka.module';
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
  AnnotationResponse,
  QualityCheck,
  Queue,
  Export,
  AuditLog,
  Notification,
  Comment,
  Template,
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
          Customer,
          User,
          Assignment,
          Annotation,
          AnnotationResponse,
          QualityCheck,
          Queue,
          Export,
          AuditLog,
          Notification,
          Comment,
          Template,
        ],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      Task,
      Assignment,
      Annotation,
      AnnotationResponse,
      Project,
      Batch,
      Workflow,
      User,
      Queue,
    ]),
    KafkaModule,
  ],
  controllers: [TaskController, BatchController],
  providers: [TaskService],
})
export class AppModule {}
