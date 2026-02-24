import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { ProjectService } from '../services/project.service';
import { WorkflowConfigService } from '../services/workflow-config.service';
import { AnnotationQuestionService } from '../services/annotation-question.service';
import { ProjectTeamService } from '../services/project-team.service';
import { PluginService } from '../services/plugin.service';
import { SecretService } from '../services/secret.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddAnnotationQuestionsDto,
  ConfigureWorkflowDto,
  AssignUserToProjectDto,
  UpdateProjectTeamMemberDto,
} from '../dto';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly workflowConfigService: WorkflowConfigService,
    private readonly questionService: AnnotationQuestionService,
    private readonly projectTeamService: ProjectTeamService,
    private readonly pluginService: PluginService,
    private readonly secretService: SecretService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all projects with optional filters' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (ACTIVE, DRAFT, etc.)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Page size (default: 50)' })
  async listProjects(
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.projectService.listProjects({
      customerId,
      status,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProject(@Param('id') id: string) {
    return this.projectService.getProject(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async createProject(@Body() createDto: CreateProjectDto) {
    return this.projectService.createProject(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProject(
    @Param('id') id: string,
    @Body() updateDto: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(id, updateDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update project status' })
  @ApiResponse({ status: 200, description: 'Project status updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'], example: 'ACTIVE' } } } })
  async updateProjectStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.projectService.updateProject(id, { status });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project (soft delete)' })
  @ApiResponse({ status: 200, description: 'Project deleted' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async deleteProject(@Param('id') id: string) {
    return this.projectService.deleteProject(id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone an existing project' })
  @ApiResponse({ status: 201, description: 'Project cloned successfully' })
  @ApiBody({ schema: { properties: { newName: { type: 'string', example: 'Cloned Project' }, copyTasks: { type: 'boolean', example: false } } } })
  async cloneProject(
    @Param('id') id: string,
    @Body() cloneDto: { newName: string; copyTasks?: boolean },
  ) {
    return this.projectService.cloneProject(id, cloneDto);
  }

  // Annotation Questions Management
  @Post(':id/annotation-questions')
  @ApiOperation({ summary: 'Add annotation questions to project' })
  @ApiResponse({ status: 201, description: 'Questions added successfully' })
  async addAnnotationQuestions(
    @Param('id') id: string,
    @Body() dto: AddAnnotationQuestionsDto,
  ) {
    return this.questionService.addQuestionsToProject(id, dto.questions);
  }

  @Get(':id/annotation-questions')
  @ApiOperation({ summary: 'Get all annotation questions for a project' })
  @ApiResponse({ status: 200, description: 'Annotation questions retrieved' })
  async getAnnotationQuestions(@Param('id') id: string) {
    return this.questionService.getProjectQuestions(id);
  }

  @Patch(':id/annotation-questions/:questionId')
  @ApiOperation({ summary: 'Update a specific annotation question' })
  @ApiResponse({ status: 200, description: 'Question updated' })
  async updateAnnotationQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() updateData: any,
  ) {
    return this.questionService.updateQuestion(id, questionId, updateData);
  }

  @Delete(':id/annotation-questions/:questionId')
  @ApiOperation({ summary: 'Delete an annotation question' })
  @ApiResponse({ status: 200, description: 'Question deleted' })
  async deleteAnnotationQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ) {
    return this.questionService.deleteQuestion(id, questionId);
  }

  // Workflow Configuration Management
  @Post(':id/workflow-configuration')
  @ApiOperation({ summary: 'Configure workflow for project (review levels, assignment rules)' })
  @ApiResponse({ status: 201, description: 'Workflow configured' })
  async configureWorkflow(
    @Param('id') id: string,
    @Body() dto: ConfigureWorkflowDto,
  ) {
    return this.workflowConfigService.configureWorkflow(id, dto);
  }

  @Get(':id/workflow-configuration')
  @ApiOperation({ summary: 'Get workflow configuration for project' })
  @ApiResponse({ status: 200, description: 'Workflow configuration retrieved' })
  async getWorkflowConfiguration(@Param('id') id: string) {
    return this.workflowConfigService.getWorkflowConfiguration(id);
  }

  @Patch(':id/workflow-configuration/annotators-per-task')
  @ApiOperation({ summary: 'Update annotators per task count' })
  @ApiResponse({ status: 200, description: 'Annotators per task updated' })
  @ApiBody({ schema: { properties: { count: { type: 'number', example: 3 } } } })
  async updateAnnotatorsPerTask(
    @Param('id') id: string,
    @Body('count') count: number,
  ) {
    return this.workflowConfigService.updateAnnotatorsPerTask(id, count);
  }

  @Post(':id/workflow-configuration/review-levels')
  @ApiOperation({ summary: 'Add a review level to workflow' })
  @ApiResponse({ status: 201, description: 'Review level added' })
  async addReviewLevel(
    @Param('id') id: string,
    @Body() reviewLevel: any,
  ) {
    return this.workflowConfigService.addReviewLevel(id, reviewLevel);
  }

  @Delete(':id/workflow-configuration/review-levels/:level')
  @ApiOperation({ summary: 'Remove a review level from workflow' })
  @ApiResponse({ status: 200, description: 'Review level removed' })
  async removeReviewLevel(
    @Param('id') id: string,
    @Param('level') level: number,
  ) {
    return this.workflowConfigService.removeReviewLevel(id, level);
  }

  // Project Statistics
  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get project statistics (task counts, completion rate, quality)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getProjectStatistics(@Param('id') id: string) {
    return this.projectService.getProjectStatistics(id);
  }

  // File Type Configuration
  @Post(':id/supported-file-types')
  @ApiOperation({ summary: 'Set supported file types for a project' })
  @ApiResponse({ status: 200, description: 'File types updated' })
  @ApiBody({ schema: { properties: { fileTypes: { type: 'array', items: { type: 'string' }, example: ['CSV', 'TXT', 'IMAGE'] } } } })
  async setSupportedFileTypes(
    @Param('id') id: string,
    @Body('fileTypes') fileTypes: string[],
  ) {
    return this.projectService.setSupportedFileTypes(id, fileTypes);
  }

  @Get(':id/supported-file-types')
  @ApiOperation({ summary: 'Get supported file types for a project' })
  @ApiResponse({ status: 200, description: 'File types retrieved' })
  async getSupportedFileTypes(@Param('id') id: string) {
    return this.projectService.getSupportedFileTypes(id);
  }

  // Project Team Management
  @Get(':id/team')
  @ApiOperation({ summary: 'Get all team members for a project' })
  @ApiResponse({ status: 200, description: 'Team members retrieved' })
  async getProjectTeam(@Param('id') id: string) {
    return this.projectTeamService.getProjectTeam(id);
  }

  @Post(':id/team')
  @ApiOperation({ summary: 'Assign a user to the project team' })
  @ApiResponse({ status: 201, description: 'User assigned to project' })
  async assignUserToProject(
    @Param('id') projectId: string,
    @Body() dto: Omit<AssignUserToProjectDto, 'projectId'>,
  ) {
    return this.projectTeamService.assignUserToProject({
      ...dto,
      projectId,
    });
  }

  @Patch(':id/team/:userId')
  @ApiOperation({ summary: 'Update team member (quota, active status)' })
  @ApiResponse({ status: 200, description: 'Team member updated' })
  async updateTeamMember(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateProjectTeamMemberDto,
  ) {
    return this.projectTeamService.updateTeamMember(projectId, userId, dto);
  }

  @Delete(':id/team/:userId')
  @ApiOperation({ summary: 'Remove user from project team' })
  @ApiResponse({ status: 200, description: 'User removed from project' })
  async removeUserFromProject(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.projectTeamService.removeUserFromProject(projectId, userId);
  }

  // ─── Plugin Management ─────────────────────────────────────────────────────

  @Get(':id/plugins')
  @ApiOperation({ summary: 'List all plugins for a project' })
  @ApiResponse({ status: 200, description: 'Plugins retrieved' })
  async listPlugins(@Param('id') projectId: string) {
    return this.pluginService.listPlugins(projectId);
  }

  @Post(':id/plugins')
  @ApiOperation({ summary: 'Create a plugin for a project' })
  @ApiResponse({ status: 201, description: 'Plugin created' })
  async createPlugin(@Param('id') projectId: string, @Body() dto: any) {
    return this.pluginService.createPlugin(projectId, dto);
  }

  @Patch(':id/plugins/:pluginId')
  @ApiOperation({ summary: 'Update a plugin' })
  @ApiResponse({ status: 200, description: 'Plugin updated' })
  async updatePlugin(
    @Param('id') projectId: string,
    @Param('pluginId') pluginId: string,
    @Body() dto: any,
  ) {
    return this.pluginService.updatePlugin(projectId, pluginId, dto);
  }

  @Delete(':id/plugins/:pluginId')
  @ApiOperation({ summary: 'Delete a plugin' })
  @ApiResponse({ status: 200, description: 'Plugin deleted' })
  async deletePlugin(
    @Param('id') projectId: string,
    @Param('pluginId') pluginId: string,
  ) {
    return this.pluginService.deletePlugin(projectId, pluginId);
  }

  @Post(':id/plugins/:pluginId/deploy')
  @ApiOperation({ summary: 'Deploy a plugin' })
  @ApiResponse({ status: 200, description: 'Plugin deployed' })
  async deployPlugin(
    @Param('id') projectId: string,
    @Param('pluginId') pluginId: string,
  ) {
    return this.pluginService.deployPlugin(projectId, pluginId);
  }

  @Post(':id/plugins/:pluginId/toggle')
  @ApiOperation({ summary: 'Enable or disable a plugin' })
  @ApiResponse({ status: 200, description: 'Plugin toggled' })
  @ApiBody({ schema: { properties: { enabled: { type: 'boolean', example: true } } } })
  async togglePlugin(
    @Param('id') projectId: string,
    @Param('pluginId') pluginId: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.pluginService.togglePlugin(projectId, pluginId, enabled);
  }

  // ─── Secret Management ─────────────────────────────────────────────────────

  @Get(':id/secrets')
  @ApiOperation({ summary: 'List all secrets for a project (values masked)' })
  @ApiResponse({ status: 200, description: 'Secrets retrieved' })
  async listSecrets(@Param('id') projectId: string) {
    return { success: true, data: { secrets: await this.secretService.listSecrets(projectId) } };
  }

  @Post(':id/secrets')
  @ApiOperation({ summary: 'Create a secret for a project' })
  @ApiResponse({ status: 201, description: 'Secret created' })
  @ApiBody({ schema: { properties: { name: { type: 'string', example: 'API_KEY' }, value: { type: 'string', example: 'sk-...' }, description: { type: 'string', example: 'External API key' } } } })
  async createSecret(
    @Param('id') projectId: string,
    @Body() dto: { name: string; value: string; description?: string },
    @Headers('x-user-id') userId: string,
  ) {
    const secret = await this.secretService.createSecret(
      projectId,
      dto.name,
      dto.value,
      dto.description,
      userId ?? null,
    );
    return { success: true, data: { secret } };
  }

  @Delete(':id/secrets/:name')
  @ApiOperation({ summary: 'Delete a secret' })
  @ApiResponse({ status: 200, description: 'Secret deleted' })
  async deleteSecret(
    @Param('id') projectId: string,
    @Param('name') name: string,
  ) {
    await this.secretService.deleteSecret(projectId, name);
    return { success: true, message: `Secret "${name}" deleted` };
  }
}
