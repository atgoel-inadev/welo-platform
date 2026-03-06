import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductivityService } from './productivity.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class ProductivityController {
  constructor(private readonly productivityService: ProductivityService) {}

  @Get('productivity')
  @ApiOperation({ summary: 'Get productivity metrics per user' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiResponse({ status: 200, description: 'Productivity metrics retrieved' })
  async getProductivity(
    @Query('userId') userId: string,
    @Query('projectId') projectId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.productivityService.getUserProductivity(userId, projectId, dateFrom, dateTo);
  }

  @Get('capacity')
  @ApiOperation({ summary: 'Get annotator capacity and projected completion for a project' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiResponse({ status: 200, description: 'Capacity metrics retrieved' })
  async getCapacity(@Query('projectId') projectId: string) {
    return this.productivityService.getCapacity(projectId);
  }
}
