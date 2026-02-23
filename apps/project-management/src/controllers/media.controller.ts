import { Controller, Get, Param, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('media')
export class MediaController {
  private readonly mediaPath = process.env.MEDIA_FILES_PATH || '/app/media';

  @Get(':filename')
  async getMediaFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      // Security: Prevent directory traversal
      const sanitizedFilename = path.basename(filename);
      const filePath = path.join(this.mediaPath, sanitizedFilename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      // Determine content type based on file extension
      const ext = path.extname(sanitizedFilename).toLowerCase();
      const contentType = this.getContentType(ext);

      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error serving file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Serve files from project/batch folders (for directory scan mode)
   * GET /api/v1/media/{projectId}/{batchName}/{filename}
   * Example: /api/v1/media/project-123/batch_001/image.jpg
   */
  @Get(':projectId/:batchName/:filename')
  async getMediaFileFromFolder(
    @Param('projectId') projectId: string,
    @Param('batchName') batchName: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    try {
      // Security: Prevent directory traversal
      const sanitizedProjectId = path.basename(projectId);
      const sanitizedBatchName = path.basename(batchName);
      const sanitizedFilename = path.basename(filename);
      
      const filePath = path.join(
        this.mediaPath,
        sanitizedProjectId,
        sanitizedBatchName,
        sanitizedFilename
      );

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      // Determine content type
      const ext = path.extname(sanitizedFilename).toLowerCase();
      const contentType = this.getContentType(ext);

      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error serving file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private getContentType(ext: string): string {
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }
}
