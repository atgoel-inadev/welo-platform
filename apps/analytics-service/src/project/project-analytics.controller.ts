import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProjectAnalyticsService } from './project-analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class ProjectAnalyticsController {
  constructor(private readonly projectAnalyticsService: ProjectAnalyticsService) {}

  @Get('projects/:id/progress')
  @ApiOperation({ summary: 'Get project progress breakdown by batch and workflow stage' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project progress retrieved' })
  async getProjectProgress(@Param('id') projectId: string) {
    return this.projectAnalyticsService.getProjectProgress(projectId);
  }

  @Get('transitions')
  @ApiOperation({ summary: 'Get state transition history for entities' })
  @ApiQuery({ name: 'entityType', required: true, description: 'e.g. TASK, BATCH' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiResponse({ status: 200, description: 'State transitions retrieved' })
  async getTransitions(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.projectAnalyticsService.getStateTransitions(entityType, entityId, dateFrom, dateTo);
  }
}
