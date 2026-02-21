import {
  Controller, Get, Post, Patch, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnnotationService } from './annotation.service';
import { SubmitAnnotationDto, UpdateAnnotationDto, CompareAnnotationsDto } from './dto/annotation.dto';

@ApiTags('annotations')
@ApiBearerAuth()
@Controller()
export class AnnotationController {
  constructor(private readonly annotationService: AnnotationService) {}

  @Post('tasks/:taskId/annotations')
  @ApiOperation({ summary: 'Submit annotation for a task (triggers auto QC if not draft)' })
  @ApiResponse({ status: 201, description: 'Annotation submitted, QC pipeline initiated' })
  @ApiResponse({ status: 404, description: 'Task or assignment not found' })
  @ApiQuery({ name: 'userId', required: true, description: 'ID of the annotating user' })
  async submit(
    @Param('taskId') taskId: string,
    @Query('userId') userId: string,
    @Body() dto: SubmitAnnotationDto,
  ) {
    return this.annotationService.submit(taskId, userId, dto);
  }

  @Get('tasks/:taskId/annotations')
  @ApiOperation({ summary: 'List all annotations for a task' })
  @ApiResponse({ status: 200, description: 'Annotations retrieved successfully' })
  async getAnnotations(@Param('taskId') taskId: string) {
    return this.annotationService.getAnnotations(taskId);
  }

  @Patch('annotations/:annotationId')
  @ApiOperation({ summary: 'Update an annotation (creates version snapshot)' })
  @ApiResponse({ status: 200, description: 'Annotation updated' })
  @ApiQuery({ name: 'userId', required: true })
  async update(
    @Param('annotationId') annotationId: string,
    @Query('userId') userId: string,
    @Body() dto: UpdateAnnotationDto,
  ) {
    return this.annotationService.update(annotationId, userId, dto);
  }

  @Get('annotations/:annotationId/history')
  @ApiOperation({ summary: 'Get annotation version history' })
  @ApiResponse({ status: 200, description: 'Version history retrieved' })
  async getHistory(@Param('annotationId') annotationId: string) {
    return this.annotationService.getHistory(annotationId);
  }

  @Post('tasks/:taskId/annotations/compare')
  @ApiOperation({ summary: 'Compare multiple annotations (inter-annotator agreement)' })
  @ApiResponse({ status: 200, description: 'Comparison metrics returned' })
  async compare(
    @Param('taskId') taskId: string,
    @Body() dto: CompareAnnotationsDto,
  ) {
    return this.annotationService.compare(taskId, dto);
  }
}
