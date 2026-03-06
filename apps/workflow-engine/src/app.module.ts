import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule, HealthModule, KafkaModule } from '@app/infrastructure';
import { WorkflowModule } from './workflow/workflow.module';
import { EventModule } from './event/event.module';
import { InstanceModule } from './instance/instance.module';
import { TransitionModule } from './transition/transition.module';
import { StateTransitionModule } from './state-transition/state-transition.module';
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
    RedisModule,
    KafkaModule.forRoot({
      clientId: 'workflow-engine',
      consumerGroupId: 'workflow-engine-group',
      topics: [
        'annotation.submitted',
        'quality_check.completed',
        'task.created',
      ],
    }),
    WorkflowModule,
    EventModule,
    InstanceModule,
    TransitionModule,
    StateTransitionModule,
    HealthModule.forRoot({ serviceName: 'workflow-engine', version: '1.0.0' }),
    TypeOrmModule.forFeature([AuditLog]),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
