export interface IStorageProvider {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;
  presignedPutUrl(key: string, mimeType: string, ttlSeconds: number): Promise<string>;
  presignedGetUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
