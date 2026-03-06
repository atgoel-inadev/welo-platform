import {
  Controller, Get, Post, Delete, Param, Query, Headers, Res,
  UseInterceptors, UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileService } from './file.service';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get()
  @ApiOperation({ summary: 'List files for a project/batch' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'batchId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async listFiles(
    @Query('projectId') projectId: string,
    @Query('batchId') batchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.fileService.listFiles(projectId, batchId, page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata by ID' })
  @ApiResponse({ status: 200, description: 'File metadata retrieved' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Param('id') id: string) {
    return this.fileService.getFile(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get presigned download URL for a file' })
  @ApiResponse({ status: 200, description: 'Download URL returned' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getDownloadUrl(@Param('id') id: string) {
    const url = await this.fileService.getDownloadUrl(id);
    return { downloadUrl: url };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Direct file upload (development / local storage mode)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'projectId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        projectId: { type: 'string', format: 'uuid' },
        batchId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Query('projectId') projectId: string,
    @Query('batchId') batchId?: string,
    @Headers('x-user-id') uploadedBy?: string,
  ) {
    return this.fileService.uploadDirect(
      file.buffer,
      file.originalname,
      file.mimetype,
      projectId,
      batchId,
      uploadedBy,
    );
  }

  @Post('presigned-url')
  @ApiOperation({ summary: 'Request a presigned S3 PUT URL for client-side upload (production)' })
  @ApiResponse({ status: 201, description: 'Presigned URL returned' })
  async requestPresignedUrl(
    @Query('fileName') fileName: string,
    @Query('mimeType') mimeType: string,
    @Query('projectId') projectId: string,
    @Query('batchId') batchId?: string,
    @Headers('x-user-id') uploadedBy?: string,
  ) {
    return this.fileService.requestPresignedUrl({ fileName, mimeType, projectId, batchId, uploadedBy });
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm upload complete after client-side S3 PUT' })
  @ApiResponse({ status: 200, description: 'File record confirmed as READY' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async confirmUpload(@Param('id') id: string) {
    return this.fileService.confirmUpload(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file (soft delete, publishes file.deleted event)' })
  @ApiResponse({ status: 204, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(
    @Param('id') id: string,
    @Headers('x-user-id') requestedBy: string,
  ) {
    await this.fileService.deleteFile(id, requestedBy);
  }
}
