import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileRecord } from './file.entity';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { LocalStorageProvider } from '../storage/local-storage.provider';
import { S3StorageProvider } from '../storage/s3-storage.provider';
import { STORAGE_PROVIDER } from '../storage/storage.interface';
import { FileEventPublisher } from '../events/file-event.publisher';

const storageProvider = {
  provide: STORAGE_PROVIDER,
  useClass: process.env.STORAGE_TYPE === 's3' ? S3StorageProvider : LocalStorageProvider,
};

@Module({
  imports: [TypeOrmModule.forFeature([FileRecord])],
  controllers: [FileController],
  providers: [FileService, FileEventPublisher, storageProvider, LocalStorageProvider, S3StorageProvider],
  exports: [FileService],
})
export class FileModule {}
