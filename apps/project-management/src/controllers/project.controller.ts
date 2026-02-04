import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ProjectService } from '../services/project.service';
import { WorkflowConfigService } from '../services/workflow-config.service';
import { AnnotationQuestionService } from '../services/annotation-question.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddAnnotationQuestionsDto,
  ConfigureWorkflowDto,
} from '../dto';

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly workflowConfigService: WorkflowConfigService,
    private readonly questionService: AnnotationQuestionService,
  ) {}

  @Get()
  async listProjects(
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 50,
  ) {
    return this.projectService.listProjects({
      customerId,
      status,
      page,
      pageSize,
    });
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    return this.projectService.getProject(id);
  }

  @Post()
  async createProject(@Body() createDto: CreateProjectDto) {
    return this.projectService.createProject(createDto);
  }

  @Patch(':id')
  async updateProject(
    @Param('id') id: string,
    @Body() updateDto: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(id, updateDto);
  }

  @Delete(':id')
  async deleteProject(@Param('id') id: string) {
    return this.projectService.deleteProject(id);
  }

  @Post(':id/clone')
  async cloneProject(
    @Param('id') id: string,
    @Body() cloneDto: { newName: string; copyTasks?: boolean },
  ) {
    return this.projectService.cloneProject(id, cloneDto);
  }

  // Annotation Questions Management
  @Post(':id/annotation-questions')
  async addAnnotationQuestions(
    @Param('id') id: string,
    @Body() dto: AddAnnotationQuestionsDto,
  ) {
    return this.questionService.addQuestionsToProject(id, dto.questions);
  }

  @Get(':id/annotation-questions')
  async getAnnotationQuestions(@Param('id') id: string) {
    return this.questionService.getProjectQuestions(id);
  }

  @Patch(':id/annotation-questions/:questionId')
  async updateAnnotationQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() updateData: any,
  ) {
    return this.questionService.updateQuestion(id, questionId, updateData);
  }

  @Delete(':id/annotation-questions/:questionId')
  async deleteAnnotationQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ) {
    return this.questionService.deleteQuestion(id, questionId);
  }

  // Workflow Configuration Management
  @Post(':id/workflow-configuration')
  async configureWorkflow(
    @Param('id') id: string,
    @Body() dto: ConfigureWorkflowDto,
  ) {
    return this.workflowConfigService.configureWorkflow(id, dto);
  }

  @Get(':id/workflow-configuration')
  async getWorkflowConfiguration(@Param('id') id: string) {
    return this.workflowConfigService.getWorkflowConfiguration(id);
  }

  @Patch(':id/workflow-configuration/annotators-per-task')
  async updateAnnotatorsPerTask(
    @Param('id') id: string,
    @Body('count') count: number,
  ) {
    return this.workflowConfigService.updateAnnotatorsPerTask(id, count);
  }

  @Post(':id/workflow-configuration/review-levels')
  async addReviewLevel(
    @Param('id') id: string,
    @Body() reviewLevel: any,
  ) {
    return this.workflowConfigService.addReviewLevel(id, reviewLevel);
  }

  @Delete(':id/workflow-configuration/review-levels/:level')
  async removeReviewLevel(
    @Param('id') id: string,
    @Param('level') level: number,
  ) {
    return this.workflowConfigService.removeReviewLevel(id, level);
  }

  // Project Statistics
  @Get(':id/statistics')
  async getProjectStatistics(@Param('id') id: string) {
    return this.projectService.getProjectStatistics(id);
  }

  // File Type Configuration
  @Post(':id/supported-file-types')
  async setSupportedFileTypes(
    @Param('id') id: string,
    @Body('fileTypes') fileTypes: string[],
  ) {
    return this.projectService.setSupportedFileTypes(id, fileTypes);
  }

  @Get(':id/supported-file-types')
  async getSupportedFileTypes(@Param('id') id: string) {
    return this.projectService.getSupportedFileTypes(id);
  }
}
