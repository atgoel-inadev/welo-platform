import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from '@app/infrastructure';
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
  ReviewApproval,
  Queue,
  Export,
  AuditLog,
  Notification,
  Comment,
  Template,
  ProjectTeamMember,
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
          ReviewApproval,
          Queue,
          Export,
          AuditLog,
          Notification,
          Comment,
          Template,
          ProjectTeamMember,
        ],
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        extra: {
          max: configService.get<number>('DB_POOL_SIZE', 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    HealthModule.forRoot({ serviceName: 'auth-service', version: '1.0.0' }),
    TypeOrmModule.forFeature([AuditLog]),
  ],
  controllers: [],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
