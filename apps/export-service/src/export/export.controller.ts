import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportFilterDto } from './dto/export-filter.dto';

@ApiTags('exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  @ApiOperation({ summary: 'List exports, optionally filtered by project/batch/status' })
  @ApiResponse({ status: 200, description: 'Exports retrieved' })
  async listExports(@Query() filter: ExportFilterDto) {
    return this.exportService.listExports(
      filter.projectId,
      filter.batchId,
      filter.status,
      filter.page ?? 1,
      filter.limit ?? 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get export status by ID' })
  @ApiResponse({ status: 200, description: 'Export retrieved' })
  @ApiResponse({ status: 404, description: 'Export not found' })
  async getExport(@Param('id') id: string) {
    return this.exportService.getExport(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for a completed export' })
  @ApiResponse({ status: 200, description: 'Download URL returned' })
  @ApiResponse({ status: 404, description: 'Export not found or not yet complete' })
  async getDownloadUrl(@Param('id') id: string) {
    const url = await this.exportService.getDownloadUrl(id);
    return { downloadUrl: url };
  }

  @Post()
  @ApiOperation({ summary: 'Request a new export job' })
  @ApiResponse({ status: 201, description: 'Export job queued (status=PENDING)' })
  async createExport(@Body() dto: CreateExportDto) {
    return this.exportService.createExport(dto);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed export job' })
  @ApiParam({ name: 'id', description: 'Export UUID' })
  @ApiResponse({ status: 200, description: 'Export requeued for processing' })
  @ApiResponse({ status: 400, description: 'Export is not in FAILED state' })
  @ApiResponse({ status: 404, description: 'Export not found' })
  async retryExport(@Param('id') id: string) {
    try {
      return await this.exportService.retryExport(id);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an export (idempotent for already-completed exports)' })
  @ApiParam({ name: 'id', description: 'Export UUID' })
  @ApiResponse({ status: 204, description: 'Export cancelled' })
  @ApiResponse({ status: 404, description: 'Export not found' })
  async cancelExport(@Param('id') id: string) {
    await this.exportService.cancelExport(id);
  }
}
