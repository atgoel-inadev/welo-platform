import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Export, Task, Batch, Project, Annotation, AnnotationResponse, QualityCheck } from '@app/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ExportJobProcessor } from './jobs/export-job.processor';
import { ExportEventHandler } from './events/export-event.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Export, Task, Batch, Project, Annotation, AnnotationResponse, QualityCheck]),
  ],
  controllers: [ExportController],
  providers: [ExportService, ExportJobProcessor, ExportEventHandler],
  exports: [ExportService],
})
export class ExportModule {}
