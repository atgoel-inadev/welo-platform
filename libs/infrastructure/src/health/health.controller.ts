import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthModuleOptions } from './health.interface';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject('HEALTH_OPTIONS') private options: HealthModuleOptions) {}

  @Get()
  @ApiOperation({ summary: 'Service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return {
      status: 'healthy',
      service: this.options.serviceName,
      version: this.options.version || '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
