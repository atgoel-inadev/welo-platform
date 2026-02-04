import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '@app/common';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async check() {
    return this.healthService.check();
  }

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Detailed system status' })
  @ApiResponse({ status: 200, description: 'System status' })
  async getStatus() {
    return this.healthService.getStatus();
  }
}
