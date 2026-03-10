import { DynamicModule, Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagingConfig } from './interfaces/messaging.interface';
import { KafkaMessagingProvider } from './providers/kafka-messaging.provider';
import { AwsMessagingProvider } from './providers/aws-messaging.provider';

export const MESSAGING_SERVICE = 'MESSAGING_SERVICE';

/**
 * Factory to create appropriate messaging provider based on configuration
 */
function messagingProviderFactory(config: MessagingConfig) {
  const logger = new Logger('MessagingProviderFactory');
  
  logger.log(`Initializing messaging provider: ${config.provider}`);
  
  switch (config.provider) {
    case 'kafka':
      logger.log('Using Kafka provider for local/Docker environment');
      return new KafkaMessagingProvider(config);
      
    case 'aws':
      logger.log('Using AWS SNS/SQS provider for production environment');
      return new AwsMessagingProvider(config);
      
    default:
      throw new Error(`Unsupported messaging provider: ${config.provider}`);
  }
}

/**
 * Global messaging module with environment-based provider selection
 * 
 * Usage:
 * ```typescript
 * MessagingModule.forRoot({
 *   provider: process.env.MESSAGING_PROVIDER as 'kafka' | 'aws',
 *   kafka: {
 *     clientId: 'my-service',
 *     consumerGroupId: 'my-group',
 *     brokers: ['localhost:9092'],
 *   },
 *   aws: {
 *     region: 'us-east-1',
 *     accountId: '123456789',
 *   },
 * })
 * ```
 * 
 * Or use forRootAsync with ConfigService:
 * ```typescript
 * MessagingModule.forRootAsync({
 *   useFactory: (configService: ConfigService) => ({
 *     provider: configService.get('MESSAGING_PROVIDER'),
 *     kafka: {
 *       clientId: configService.get('KAFKA_CLIENT_ID'),
 *       consumerGroupId: configService.get('KAFKA_CONSUMER_GROUP_ID'),
 *       brokers: configService.get('KAFKA_BROKERS').split(','),
 *     },
 *     aws: {
 *       region: configService.get('AWS_REGION'),
 *       accountId: configService.get('AWS_ACCOUNT_ID'),
 *     },
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Global()
@Module({})
export class MessagingModule {
  /**
   * Register module with static configuration
   */
  static forRoot(config: MessagingConfig): DynamicModule {
    const provider = {
      provide: MESSAGING_SERVICE,
      useFactory: () => messagingProviderFactory(config),
    };

    return {
      module: MessagingModule,
      providers: [provider],
      exports: [MESSAGING_SERVICE],
    };
  }

  /**
   * Register module with async configuration (ConfigService)
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<MessagingConfig> | MessagingConfig;
    inject?: any[];
  }): DynamicModule {
    const provider = {
      provide: MESSAGING_SERVICE,
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);
        return messagingProviderFactory(config);
      },
      inject: options.inject || [],
    };

    return {
      module: MessagingModule,
      providers: [provider],
      exports: [MESSAGING_SERVICE],
    };
  }
}
