import { DynamicModule, Global, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { KafkaModuleOptions } from './kafka.interface';

@Global()
@Module({})
export class KafkaModule {
  static forRoot(options: KafkaModuleOptions): DynamicModule {
    return {
      module: KafkaModule,
      providers: [
        {
          provide: 'KAFKA_OPTIONS',
          useValue: options,
        },
        KafkaService,
      ],
      exports: [KafkaService],
    };
  }
}
