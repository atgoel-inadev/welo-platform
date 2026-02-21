import {
  Controller, Get, Post, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QualityCheckService } from './quality-check.service';
import { QualityGateService } from '../services/quality-gate.service';
import {
  CreateQualityCheckDto,
  ResolveQualityCheckDto,
  RunBatchAutomatedQcDto,
  CreateQualityRuleDto,
  CheckQualityGateDto,
  CheckConsensusQualityGateDto,
} from './dto/quality-check.dto';

@ApiTags('quality-checks')
@ApiBearerAuth()
@Controller()
export class QualityCheckController {
  constructor(
    private readonly qualityCheckService: QualityCheckService,
    private readonly qualityGateService: QualityGateService,
  ) {}

  @Post('tasks/:taskId/quality-checks')
  @ApiOperation({ summary: 'Manually create a quality check for a task annotation' })
  @ApiResponse({ status: 201, description: 'Quality check created' })
  async createManual(
    @Param('taskId') taskId: string,
    @Body() dto: CreateQualityCheckDto,
  ) {
    return this.qualityCheckService.createManual(taskId, dto);
  }

  @Get('tasks/:taskId/quality-checks')
  @ApiOperation({ summary: 'List all quality checks for a task' })
  @ApiResponse({ status: 200, description: 'Quality checks returned' })
  async getByTask(@Param('taskId') taskId: string) {
    return this.qualityCheckService.getByTask(taskId);
  }

  @Get('quality-checks/:checkId')
  @ApiOperation({ summary: 'Get a specific quality check' })
  @ApiResponse({ status: 200, description: 'Quality check returned' })
  async getOne(@Param('checkId') checkId: string) {
    return this.qualityCheckService.getOne(checkId);
  }

  @Post('quality-checks/:checkId/resolve')
  @ApiOperation({ summary: 'Mark a quality check issue as resolved' })
  @ApiResponse({ status: 200, description: 'Quality check resolved' })
  async resolve(
    @Param('checkId') checkId: string,
    @Body() dto: ResolveQualityCheckDto,
  ) {
    return this.qualityCheckService.resolve(checkId, dto);
  }

  @Post('batches/:batchId/quality-checks/automated')
  @ApiOperation({ summary: 'Run automated QC across a batch (samples by percentage)' })
  @ApiResponse({ status: 200, description: 'Batch QC results returned' })
  async runBatchAutomated(
    @Param('batchId') batchId: string,
    @Body() dto: RunBatchAutomatedQcDto,
  ) {
    return this.qualityCheckService.runBatchAutomated(batchId, dto.samplePercentage);
  }

  @Get('projects/:projectId/quality-metrics')
  @ApiOperation({ summary: 'Get aggregate quality metrics for a project' })
  @ApiResponse({ status: 200, description: 'Quality metrics returned' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getProjectMetrics(
    @Param('projectId') projectId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.qualityCheckService.getProjectMetrics(projectId, startDate, endDate);
  }

  // Quality Rules endpoints
  @Post('projects/:projectId/quality-rules')
  @ApiOperation({ summary: 'Create a quality rule for a project' })
  @ApiResponse({ status: 201, description: 'Rule created' })
  async createRule(
    @Param('projectId') projectId: string,
    @Body() dto: CreateQualityRuleDto,
  ) {
    return this.qualityCheckService.createRule(projectId, dto);
  }

  @Get('projects/:projectId/quality-rules')
  @ApiOperation({ summary: 'List all quality rules for a project' })
  @ApiResponse({ status: 200, description: 'Rules returned' })
  async getRules(@Param('projectId') projectId: string) {
    return this.qualityCheckService.getRules(projectId);
  }

  @Delete('quality-rules/:ruleId')
  @ApiOperation({ summary: 'Deactivate a quality rule' })
  @ApiResponse({ status: 200, description: 'Rule deactivated' })
  async deleteRule(@Param('ruleId') ruleId: string) {
    return this.qualityCheckService.deleteRule(ruleId);
  }

  // ========== Quality Gate Endpoints ==========

  @Post('quality-gates/check')
  @ApiOperation({ 
    summary: 'Check quality gate for annotation',
    description: 'Validates annotation quality score against project threshold and triggers workflow events'
  })
  @ApiResponse({ status: 200, description: 'Quality gate check completed' })
  @ApiResponse({ status: 404, description: 'Task or annotation not found' })
  async checkQualityGate(@Body() dto: CheckQualityGateDto) {
    return this.qualityGateService.checkQualityGate(
      dto.taskId,
      dto.annotationId,
      dto.stageId,
    );
  }

  @Post('quality-gates/check-consensus')
  @ApiOperation({
    summary: 'Check quality gate for consensus annotations',
    description: 'Aggregates quality scores from multiple annotators and validates against threshold'
  })
  @ApiResponse({ status: 200, description: 'Consensus quality gate check completed' })
  @ApiResponse({ status: 404, description: 'Task or annotations not found' })
  async checkConsensusQualityGate(@Body() dto: CheckConsensusQualityGateDto) {
    return this.qualityGateService.checkConsensusQualityGate(
      dto.taskId,
      dto.annotationIds,
      dto.stageId,
    );
  }
}
