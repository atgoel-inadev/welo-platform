import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QualityService } from './quality.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Get('quality-trends')
  @ApiOperation({ summary: 'Get quality score trends over time' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'batchId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiResponse({ status: 200, description: 'Quality trends retrieved' })
  async getQualityTrends(
    @Query('projectId') projectId?: string,
    @Query('batchId') batchId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.qualityService.getQualityTrends(projectId, batchId, dateFrom, dateTo);
  }

  @Get('quality/by-annotator')
  @ApiOperation({ summary: 'Get quality breakdown per annotator for a project' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiResponse({ status: 200, description: 'Per-annotator quality metrics retrieved' })
  async getQualityByAnnotator(
    @Query('projectId') projectId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.qualityService.getQualityByAnnotator(projectId, dateFrom, dateTo);
  }
}
