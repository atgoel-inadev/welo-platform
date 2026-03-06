import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule, RedisModule, HealthModule } from '@app/infrastructure';
import { FileModule } from './file/file.module';
import { FileRecord } from './file/file.entity';

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
        entities: [FileRecord],
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
    KafkaModule.forRoot({
      clientId: 'file-storage-service',
      consumerGroupId: 'file-storage-group',
      topics: [
        'file.uploaded',
        'file.deleted',
      ],
    }),
    RedisModule,
    FileModule,
    HealthModule.forRoot({ serviceName: 'file-storage-service', version: '1.0.0' }),
  ],
})
export class AppModule {}
