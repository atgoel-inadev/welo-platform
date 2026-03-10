import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule, RedisModule, HealthModule } from '@app/infrastructure';
import {
  Export,
  Task,
  Batch,
  Project,
  Annotation,
  AnnotationResponse,
  QualityCheck,
} from '@app/common';
import { ExportModule } from './export/export.module';

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
          Export,
          Task,
          Batch,
          Project,
          Annotation,
          AnnotationResponse,
          QualityCheck,
        ],
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
    MessagingModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        provider: configService.get('MESSAGING_PROVIDER', 'kafka') as 'kafka' | 'aws',
        kafka: {
          clientId: 'export-service',
          consumerGroupId: 'export-group',
          topics: [
            'batch.completed',
            'export.completed',
            'export.failed',
          ],
        },
        aws: {
          region: configService.get('AWS_REGION', 'us-east-1'),
          topics: [
            'batch.completed',
            'export.completed',
            'export.failed',
          ],
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    ExportModule,
    HealthModule.forRoot({ serviceName: 'export-service', version: '1.0.0' }),
  ],
})
export class AppModule {}
