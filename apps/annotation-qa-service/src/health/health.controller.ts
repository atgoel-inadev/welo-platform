import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Service health check' })
  check() {
    return {
      status: 'healthy',
      service: 'annotation-qa-service',
      timestamp: new Date().toISOString(),
    };
  }
}
