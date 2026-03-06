import { Injectable, Logger } from '@nestjs/common';
import { IStorageProvider } from './storage.interface';

/**
 * S3StorageProvider — production storage backend.
 * Requires: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
 *
 * Install when ready for production:
 *   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 *
 * This file is a stub that throws NotImplementedError until the AWS SDK is installed.
 */
@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);

  // TODO: inject S3Client when @aws-sdk/client-s3 is installed
  // private readonly s3: S3Client;
  // private readonly bucket: string;

  constructor() {
    this.logger.warn(
      'S3StorageProvider is a stub. Set STORAGE_TYPE=local for development. ' +
      'Install @aws-sdk/client-s3 and implement before deploying to production.',
    );
  }

  async upload(_key: string, _buffer: Buffer, _mimeType: string): Promise<string> {
    throw new Error('S3StorageProvider not implemented. Use LocalStorageProvider in development.');
  }

  async presignedPutUrl(_key: string, _mimeType: string, _ttlSeconds: number): Promise<string> {
    throw new Error('S3StorageProvider not implemented.');
  }

  async presignedGetUrl(_key: string, _ttlSeconds: number): Promise<string> {
    throw new Error('S3StorageProvider not implemented.');
  }

  async delete(_key: string): Promise<void> {
    throw new Error('S3StorageProvider not implemented.');
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error('S3StorageProvider not implemented.');
  }
}
