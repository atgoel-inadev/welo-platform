import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  SimulateWorkflowDto,
  WorkflowValidationResultDto,
} from './dto/workflow.dto';
import { WorkflowStatus, ResponseDto } from '@app/common';

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async create(@Body() createDto: CreateWorkflowDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    const workflow = await this.workflowService.create(createDto, userId);
    return new ResponseDto(workflow);
  }

  @Get()
  @ApiOperation({ summary: 'List all workflows' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  async findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: WorkflowStatus,
    @Query('isTemplate') isTemplate?: boolean,
  ) {
    const workflows = await this.workflowService.findAll(projectId, status, isTemplate);
    return new ResponseDto(workflows);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async findOne(@Param('id') id: string) {
    const workflow = await this.workflowService.findOne(id);
    return new ResponseDto(workflow);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateWorkflowDto) {
    const workflow = await this.workflowService.update(id, updateDto);
    return new ResponseDto(workflow);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.workflowService.remove(id);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate workflow definition' })
  @ApiResponse({ status: 200, description: 'Validation result', type: WorkflowValidationResultDto })
  async validate(@Param('id') id: string) {
    const result = await this.workflowService.validate(id);
    return new ResponseDto(result);
  }

  @Post(':id/simulate')
  @ApiOperation({ summary: 'Simulate workflow execution' })
  @ApiResponse({ status: 200, description: 'Simulation result' })
  async simulate(@Param('id') id: string, @Body() simulateDto: SimulateWorkflowDto) {
    const result = await this.workflowService.simulate(id, simulateDto);
    return new ResponseDto(result);
  }

  @Get(':id/visualization')
  @ApiOperation({ summary: 'Get workflow visualization' })
  @ApiResponse({ status: 200, description: 'Visualization data' })
  async getVisualization(@Param('id') id: string) {
    const workflow = await this.workflowService.findOne(id);
    return new ResponseDto({
      workflowId: workflow.id,
      visualizationConfig: workflow.visualizationConfig,
      xstateDefinition: workflow.xstateDefinition,
      message: 'Use XState Visualizer (stately.ai/viz) with the xstateDefinition',
    });
  }
}
