import { Controller, Get, Param, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('media')
@Controller('media')
export class MediaController {
  private readonly mediaPath = process.env.MEDIA_FILES_PATH || '/app/media';

  /**
   * Serve files from project/batch folders (for directory scan mode)
   * GET /api/v1/media/{projectId}/{batchName}/{filename}
   * Example: /api/v1/media/project-123/batch_001/image.jpg
   * 
   * NOTE: This route MUST come BEFORE the flat :filename route to avoid conflicts!
   */
  @Get(':projectId/:batchName/:filename')
  @ApiOperation({ summary: 'Serve media file from project/batch folder' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'batchName', description: 'Batch name (sanitized)' })
  @ApiParam({ name: 'filename', description: 'File name' })
  @ApiResponse({ status: 200, description: 'File streamed successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
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

      console.log('[MediaController] Serving file:', {
        url: `${sanitizedProjectId}/${sanitizedBatchName}/${sanitizedFilename}`,
        fullPath: filePath,
        exists: fs.existsSync(filePath)
      });

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('[MediaController] File not found:', filePath);
        throw new HttpException(`File not found: ${filePath}`, HttpStatus.NOT_FOUND);
      }

      // Get file stats for Content-Length
      const stats = fs.statSync(filePath);

      // Determine content type
      const ext = path.extname(sanitizedFilename).toLowerCase();
      const contentType = this.getContentType(ext);

      console.log('[MediaController] Serving:', {
        file: sanitizedFilename,
        contentType,
        sizeBytes: stats.size
      });

      // Set headers for proper image display
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stats.size.toString());
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin
      res.setHeader('Accept-Ranges', 'bytes'); // Enable range requests
      
      // For images, don't use Content-Disposition attachment
      if (contentType.startsWith('image/')) {
        // No Content-Disposition header - let browser display inline
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
      }

      // Stream file efficiently
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        console.error('[MediaController] Stream error:', error);
        if (!res.headersSent) {
          res.status(500).send('Error streaming file');
        }
      });
      
      fileStream.pipe(res);

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error serving project media file:', error);
      throw new HttpException('Error serving file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Serve a media file by filename (flat structure - legacy)' })
  @ApiParam({ name: 'filename', description: 'Filename to serve (e.g., image.jpg, audio.mp3)' })
  @ApiResponse({ status: 200, description: 'File streamed successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 500, description: 'Error serving file' })
  async getMediaFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      // Security: Prevent directory traversal
      const sanitizedFilename = path.basename(filename);
      const filePath = path.join(this.mediaPath, sanitizedFilename);

      console.log('[MediaController] Flat route - Serving file:', {
        filename: sanitizedFilename,
        fullPath: filePath,
        exists: fs.existsSync(filePath)
      });

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('[MediaController] File not found:', filePath);
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      // Get file stats for Content-Length
      const stats = fs.statSync(filePath);

      // Determine content type based on file extension
      const ext = path.extname(sanitizedFilename).toLowerCase();
      const contentType = this.getContentType(ext);

      console.log('[MediaController] Flat route - Serving:', {
        file: sanitizedFilename,
        contentType,
        sizeBytes: stats.size
      });

      // Set headers for proper display
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stats.size.toString());
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // For images, don't use Content-Disposition
      if (!contentType.startsWith('image/')) {
        res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
      }

      // Stream file efficiently
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        console.error('[MediaController] Stream error:', error);
        if (!res.headersSent) {
          res.status(500).send('Error streaming file');
        }
      });

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
