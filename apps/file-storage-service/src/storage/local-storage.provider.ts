import { Injectable, Logger } from '@nestjs/common';
import { IStorageProvider } from './storage.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor() {
    this.basePath = process.env.MEDIA_FILES_PATH || '/app/media';
    this.baseUrl = process.env.FILE_STORAGE_BASE_URL || 'http://localhost:3006/api/v1/files';
  }

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buffer);
    this.logger.debug(`File stored locally: ${fullPath}`);
    return `${this.baseUrl}/${key}/download`;
  }

  async presignedPutUrl(key: string, _mimeType: string, _ttlSeconds: number): Promise<string> {
    // In local mode: return a direct upload URL handled by the file controller
    return `${this.baseUrl}/upload?key=${encodeURIComponent(key)}`;
  }

  async presignedGetUrl(key: string, _ttlSeconds: number): Promise<string> {
    return `${this.baseUrl}/${encodeURIComponent(key)}/download`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.debug(`File deleted locally: ${fullPath}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(path.join(this.basePath, key));
  }
}
