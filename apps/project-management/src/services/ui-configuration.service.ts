import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '@app/common/entities';
import { CreateUIConfigurationDto, UpdateUIConfigurationDto, UIConfigurationResponseDto } from '../dto/ui-configuration.dto';

/**
 * UI Configuration Service
 * Manages dynamic UI configurations for annotation and review interfaces
 * Follows SOLID principles and clean architecture
 */
@Injectable()
export class UIConfigurationService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Create or update UI configuration for a project
   * Single Responsibility: Only handles UI configuration CRUD
   */
  async createOrUpdateUIConfiguration(
    projectId: string,
    dto: CreateUIConfigurationDto,
    userId: string,
  ): Promise<UIConfigurationResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Validate UI configuration structure
    this.validateUIConfiguration(dto.configuration);

    // Get current configuration or initialize
    const currentConfig = project.configuration || {
      annotationSchema: {},
      qualityThresholds: {},
      workflowRules: {},
      uiConfiguration: {},
    };

    // Create version history entry
    const version = this.generateVersion();
    const newVersionEntry = {
      version,
      configuration: dto.configuration,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      description: dto.description || 'UI configuration update',
    };

    // Update configuration with new UI and version history
    const updatedConfig = {
      ...currentConfig,
      uiConfiguration: dto.configuration,
      uiConfigurationVersions: [
        ...(currentConfig.uiConfiguration?.['versions'] || []),
        newVersionEntry,
      ].slice(-50), // Keep last 50 versions
    };

    // Save updated project configuration
    await this.projectRepository.update(
      { id: projectId },
      {
        configuration: updatedConfig as any, // TypeORM JSONB type issue
        updatedAt: new Date(),
      },
    );

    return {
      id: projectId,
      version,
      name: dto.name || `UI Configuration ${version}`,
      description: dto.description,
      configuration: dto.configuration,
      projectId,
      createdBy: userId,
      createdAt: new Date(),
      metadata: {
        totalWidgets: dto.configuration.widgets?.length || 0,
        fileType: dto.configuration.fileType,
        responseType: dto.configuration.responseType,
        pipelineModes: this.extractPipelineModes(dto.configuration),
      },
    };
  }

  /**
   * Get UI configuration for a project
   */
  async getUIConfiguration(projectId: string): Promise<UIConfigurationResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const uiConfig = project.configuration?.uiConfiguration;

    if (!uiConfig || !uiConfig.configuration) {
      throw new NotFoundException(`No UI configuration found for project ${projectId}`);
    }

    const versions = project.configuration?.uiConfiguration?.['versions'] || [];
    const latestVersion = versions[versions.length - 1];

    return {
      id: projectId,
      version: latestVersion?.version || '1.0.0',
      name: uiConfig.name || 'UI Configuration',
      description: uiConfig.description,
      configuration: latestVersion?.configuration || uiConfig.configuration,
      projectId,
      createdBy: latestVersion?.createdBy || project.createdBy,
      createdAt: latestVersion?.createdAt ? new Date(latestVersion.createdAt) : project.createdAt,
      metadata: {
        totalWidgets: uiConfig.configuration?.widgets?.length || 0,
        fileType: uiConfig.configuration?.fileType,
        responseType: uiConfig.configuration?.responseType,
        pipelineModes: this.extractPipelineModes(uiConfig.configuration),
      },
    };
  }

  /**
   * Get all UI configuration versions for a project
   */
  async getUIConfigurationVersions(projectId: string): Promise<any[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const versions = project.configuration?.uiConfiguration?.['versions'] || [];

    return versions.map((v) => ({
      version: v.version,
      description: v.description,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      totalWidgets: v.configuration?.widgets?.length || 0,
    }));
  }

  /**
   * Get specific version of UI configuration
   */
  async getUIConfigurationVersion(
    projectId: string,
    version: string,
  ): Promise<UIConfigurationResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const versions = project.configuration?.uiConfiguration?.['versions'] || [];
    const versionEntry = versions.find((v) => v.version === version);

    if (!versionEntry) {
      throw new NotFoundException(`Version ${version} not found for project ${projectId}`);
    }

    return {
      id: projectId,
      version: versionEntry.version,
      name: `UI Configuration ${version}`,
      description: versionEntry.description,
      configuration: versionEntry.configuration,
      projectId,
      createdBy: versionEntry.createdBy,
      createdAt: new Date(versionEntry.createdAt),
      metadata: {
        totalWidgets: versionEntry.configuration?.widgets?.length || 0,
        fileType: versionEntry.configuration?.fileType,
        responseType: versionEntry.configuration?.responseType,
        pipelineModes: this.extractPipelineModes(versionEntry.configuration),
      },
    };
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(
    projectId: string,
    version: string,
    userId: string,
  ): Promise<UIConfigurationResponseDto> {
    const versionConfig = await this.getUIConfigurationVersion(projectId, version);

    // Create new version with rollback note
    return this.createOrUpdateUIConfiguration(
      projectId,
      {
        name: versionConfig.name,
        description: `Rolled back to version ${version}`,
        configuration: versionConfig.configuration,
      },
      userId,
    );
  }

  /**
   * Delete UI configuration (soft delete - keeps versions)
   */
  async deleteUIConfiguration(projectId: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const currentConfig = project.configuration || {};
    const updatedConfig = {
      ...currentConfig,
      uiConfiguration: {
        ...(currentConfig as any).uiConfiguration,
        configuration: null,
        deletedAt: new Date().toISOString(),
      },
    };

    await this.projectRepository.update(
      { id: projectId },
      { configuration: updatedConfig as any },
    );
  }

  /**
   * Validate UI configuration structure
   * Ensures configuration follows expected schema
   */
  private validateUIConfiguration(config: any): void {
    if (!config) {
      throw new BadRequestException('UI configuration cannot be empty');
    }

    // Check if new structure (annotatorView/reviewerView) or old structure
    if (config.annotatorView || config.reviewerView) {
      // New structure - validate both views
      if (config.annotatorView) {
        this.validateAnnotatorView(config.annotatorView);
      }
      if (config.reviewerView) {
        this.validateReviewerView(config.reviewerView);
      }
    } else {
      // Old structure - validate legacy format
      this.validateLegacyConfiguration(config);
    }
  }

  /**
   * Validate annotator view (mandatory: fileViewerWidget, questionsWidget)
   */
  private validateAnnotatorView(view: any): void {
    if (!view.fileViewerWidget) {
      throw new BadRequestException(
        'Annotator view must include fileViewerWidget (mandatory for displaying task files)',
      );
    }

    if (!view.questionsWidget) {
      throw new BadRequestException(
        'Annotator view must include questionsWidget (mandatory for displaying annotation questions)',
      );
    }

    // Validate fileViewerWidget structure
    this.validateWidgetStructure(view.fileViewerWidget, 'fileViewerWidget');

    // Validate questionsWidget structure
    this.validateWidgetStructure(view.questionsWidget, 'questionsWidget');
    
    if (!['vertical', 'horizontal', 'grid'].includes(view.questionsWidget.layout)) {
      throw new BadRequestException(
        'questionsWidget.layout must be one of: vertical, horizontal, grid',
      );
    }

    // Validate extra widgets if present
    if (view.extraWidgets && Array.isArray(view.extraWidgets)) {
      view.extraWidgets.forEach((widget: any, index: number) => {
        this.validateWidget(widget, index);
      });
    }
  }

  /**
   * Validate reviewer view (mandatory: fileViewerWidget, annotationReviewWidget)
   */
  private validateReviewerView(view: any): void {
    if (!view.fileViewerWidget) {
      throw new BadRequestException(
        'Reviewer view must include fileViewerWidget (mandatory for displaying task files)',
      );
    }

    if (!view.annotationReviewWidget) {
      throw new BadRequestException(
        'Reviewer view must include annotationReviewWidget (mandatory for reviewing annotations)',
      );
    }

    // Validate fileViewerWidget structure
    this.validateWidgetStructure(view.fileViewerWidget, 'fileViewerWidget');

    // Validate annotationReviewWidget structure
    this.validateWidgetStructure(view.annotationReviewWidget, 'annotationReviewWidget');

    // Validate extra widgets if present
    if (view.extraWidgets && Array.isArray(view.extraWidgets)) {
      view.extraWidgets.forEach((widget: any, index: number) => {
        this.validateWidget(widget, index);
      });
    }
  }

  /**
   * Validate widget structure (position, size)
   */
  private validateWidgetStructure(widget: any, widgetName: string): void {
    if (!widget.position || typeof widget.position.x !== 'number' || typeof widget.position.y !== 'number') {
      throw new BadRequestException(
        `${widgetName} has invalid position (must have x, y as numbers)`,
      );
    }

    if (!widget.size || typeof widget.size.width !== 'number' || typeof widget.size.height !== 'number') {
      throw new BadRequestException(
        `${widgetName} has invalid size (must have width, height as numbers)`,
      );
    }
  }

  /**
   * Validate legacy configuration format (backward compatibility)
   */
  private validateLegacyConfiguration(config: any): void {
    // Required fields for legacy format
    const requiredFields = ['fileType', 'responseType', 'widgets'];
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new BadRequestException(`UI configuration missing required field: ${field}`);
      }
    }

    // Validate widgets array
    if (!Array.isArray(config.widgets)) {
      throw new BadRequestException('widgets must be an array');
    }

    // Validate each widget
    config.widgets.forEach((widget: any, index: number) => {
      this.validateWidget(widget, index);
    });

    // Validate file type
    const validFileTypes = ['TEXT', 'MARKDOWN', 'HTML', 'IMAGE', 'VIDEO', 'AUDIO', 'CSV', 'PDF'];
    if (!validFileTypes.includes(config.fileType)) {
      throw new BadRequestException(
        `Invalid fileType. Must be one of: ${validFileTypes.join(', ')}`,
      );
    }

    // Validate response type
    const validResponseTypes = [
      'TEXT',
      'SINGLE_SELECT',
      'MULTI_SELECT',
      'RATING',
      'BOOLEAN',
      'NUMBER',
      'DATE',
      'STRUCTURED',
    ];
    if (!validResponseTypes.includes(config.responseType)) {
      throw new BadRequestException(
        `Invalid responseType. Must be one of: ${validResponseTypes.join(', ')}`,
      );
    }
  }

  /**
   * Validate individual widget
   */
  private validateWidget(widget: any, index: number): void {
    if (!widget.id || !widget.type) {
      throw new BadRequestException(
        `Widget at index ${index} missing required fields (id, type)`,
      );
    }

    // Validate widget position and size
    if (!widget.position || typeof widget.position.x !== 'number' || typeof widget.position.y !== 'number') {
      throw new BadRequestException(
        `Widget ${widget.id} has invalid position`,
      );
    }

    if (!widget.size || typeof widget.size.width !== 'number' || typeof widget.size.height !== 'number') {
      throw new BadRequestException(
        `Widget ${widget.id} has invalid size`,
      );
    }
  }

  /**
   * Get UI configuration for specific view type (annotator or reviewer)
   */
  async getUIConfigurationForTask(
    projectId: string,
    viewType: 'annotator' | 'reviewer',
  ): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const uiConfig = project.configuration?.uiConfiguration;

    if (!uiConfig) {
      throw new NotFoundException(`No UI configuration found for project ${projectId}`);
    }

    // Check if new structure exists
    if (uiConfig.annotatorView || uiConfig.reviewerView) {
      const view = viewType === 'annotator' ? uiConfig.annotatorView : uiConfig.reviewerView;
      
      if (!view) {
        throw new NotFoundException(
          `No ${viewType} view configuration found for project ${projectId}`,
        );
      }

      return view;
    }

    // Fall back to legacy structure
    const versions = uiConfig.versions || [];
    const latestVersion = versions[versions.length - 1];
    const configuration = latestVersion?.configuration || uiConfig.configuration;

    // Return legacy format (will be handled by frontend)
    return {
      legacy: true,
      configuration,
    };
  }

  /**
   * Generate semantic version number
   */
  private generateVersion(): string {
    const now = new Date();
    return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}-${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
  }

  /**
   * Extract pipeline modes from configuration
   */
  private extractPipelineModes(config: any): string[] {
    if (!config?.widgets) return [];

    const modes = new Set<string>();
    config.widgets.forEach((widget: any) => {
      if (widget.pipelineModes && Array.isArray(widget.pipelineModes)) {
        widget.pipelineModes.forEach((mode: string) => modes.add(mode));
      }
    });

    return Array.from(modes);
  }
}
