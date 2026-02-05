import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UIConfigurationService } from '../services/ui-configuration.service';
import {
  CreateUIConfigurationDto,
  UpdateUIConfigurationDto,
  UIConfigurationResponseDto,
  UIConfigurationVersionDto,
} from '../dto/ui-configuration.dto';

/**
 * UI Configuration Controller
 * RESTful API for managing dynamic UI configurations
 * Follows REST best practices and clean architecture
 */
@ApiTags('ui-configurations')
@Controller('api/v1/projects')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Uncomment when auth is implemented
export class UIConfigurationController {
  constructor(private readonly uiConfigurationService: UIConfigurationService) {}

  /**
   * Create or update UI configuration for a project
   * POST /api/v1/projects/:projectId/ui-configurations
   */
  @Post(':projectId/ui-configurations')
  @ApiOperation({
    summary: 'Create or update UI configuration',
    description: 'Creates a new UI configuration or updates existing one with version tracking',
  })
  @ApiResponse({
    status: 201,
    description: 'UI configuration created/updated successfully',
    type: UIConfigurationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid configuration data' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async createOrUpdate(
    @Param('projectId') projectId: string,
    @Body() dto: CreateUIConfigurationDto,
    @Request() req: any,
  ): Promise<UIConfigurationResponseDto> {
    const userId = req.user?.id || 'system';
    return this.uiConfigurationService.createOrUpdateUIConfiguration(projectId, dto, userId);
  }

  /**
   * Get UI configuration for a project
   * GET /api/v1/projects/:projectId/ui-configurations
   */
  @Get(':projectId/ui-configurations')
  @ApiOperation({
    summary: 'Get UI configuration',
    description: 'Retrieves the current UI configuration for a project',
  })
  @ApiResponse({
    status: 200,
    description: 'UI configuration retrieved successfully',
    type: UIConfigurationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project or configuration not found' })
  async get(@Param('projectId') projectId: string): Promise<UIConfigurationResponseDto> {
    return this.uiConfigurationService.getUIConfiguration(projectId);
  }

  /**
   * Update UI configuration
   * PUT /api/v1/projects/:projectId/ui-configurations
   */
  @Put(':projectId/ui-configurations')
  @ApiOperation({
    summary: 'Update UI configuration',
    description: 'Updates UI configuration and creates a new version',
  })
  @ApiResponse({
    status: 200,
    description: 'UI configuration updated successfully',
    type: UIConfigurationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid configuration data' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateUIConfigurationDto,
    @Request() req: any,
  ): Promise<UIConfigurationResponseDto> {
    const userId = req.user?.id || 'system';
    return this.uiConfigurationService.createOrUpdateUIConfiguration(projectId, dto, userId);
  }

  /**
   * Get all configuration versions
   * GET /api/v1/projects/:projectId/ui-configurations/versions
   */
  @Get(':projectId/ui-configurations/versions')
  @ApiOperation({
    summary: 'Get configuration versions',
    description: 'Retrieves all versions of UI configuration for a project',
  })
  @ApiResponse({
    status: 200,
    description: 'Versions retrieved successfully',
    type: [UIConfigurationVersionDto],
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getVersions(@Param('projectId') projectId: string): Promise<UIConfigurationVersionDto[]> {
    return this.uiConfigurationService.getUIConfigurationVersions(projectId);
  }

  /**
   * Get specific configuration version
   * GET /api/v1/projects/:projectId/ui-configurations/versions/:version
   */
  @Get(':projectId/ui-configurations/versions/:version')
  @ApiOperation({
    summary: 'Get specific configuration version',
    description: 'Retrieves a specific version of UI configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Version retrieved successfully',
    type: UIConfigurationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project or version not found' })
  async getVersion(
    @Param('projectId') projectId: string,
    @Param('version') version: string,
  ): Promise<UIConfigurationResponseDto> {
    return this.uiConfigurationService.getUIConfigurationVersion(projectId, version);
  }

  /**
   * Rollback to specific version
   * POST /api/v1/projects/:projectId/ui-configurations/versions/:version/rollback
   */
  @Post(':projectId/ui-configurations/versions/:version/rollback')
  @ApiOperation({
    summary: 'Rollback to version',
    description: 'Rolls back UI configuration to a specific version',
  })
  @ApiResponse({
    status: 200,
    description: 'Rollback successful',
    type: UIConfigurationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project or version not found' })
  async rollback(
    @Param('projectId') projectId: string,
    @Param('version') version: string,
    @Request() req: any,
  ): Promise<UIConfigurationResponseDto> {
    const userId = req.user?.id || 'system';
    return this.uiConfigurationService.rollbackToVersion(projectId, version, userId);
  }

  /**
   * Delete UI configuration
   * DELETE /api/v1/projects/:projectId/ui-configurations
   */
  @Delete(':projectId/ui-configurations')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete UI configuration',
    description: 'Soft deletes UI configuration (keeps version history)',
  })
  @ApiResponse({ status: 204, description: 'Configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async delete(@Param('projectId') projectId: string): Promise<void> {
    return this.uiConfigurationService.deleteUIConfiguration(projectId);
  }

  /**
   * Get UI configuration for specific view (annotator or reviewer)
   * GET /api/v1/projects/:projectId/ui-configurations/view/:viewType
   */
  @Get(':projectId/ui-configurations/view/:viewType')
  @ApiOperation({
    summary: 'Get UI configuration for specific view',
    description: 'Returns view-specific configuration (annotator or reviewer view)',
  })
  @ApiResponse({
    status: 200,
    description: 'View configuration retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or view not found' })
  async getUIConfigurationForView(
    @Param('projectId') projectId: string,
    @Param('viewType') viewType: 'annotator' | 'reviewer',
  ) {
    const viewConfig = await this.uiConfigurationService.getUIConfigurationForTask(
      projectId,
      viewType,
    );
    return {
      projectId,
      viewType,
      configuration: viewConfig,
    };
  }
}
