import { DynamicModule, Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthModuleOptions } from './health.interface';

@Module({})
export class HealthModule {
  static forRoot(options: HealthModuleOptions): DynamicModule {
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: [
        {
          provide: 'HEALTH_OPTIONS',
          useValue: options,
        },
      ],
    };
  }
}
