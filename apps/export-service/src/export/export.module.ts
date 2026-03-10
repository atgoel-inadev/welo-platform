import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Export, Task, Batch, Project, Annotation, AnnotationResponse, QualityCheck } from '@app/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ExportJobProcessor } from './jobs/export-job.processor';
import { ExportEventHandler } from './events/export-event.handler';
import { JsonFormatter } from '../formatters/json.formatter';
import { JsonlFormatter } from '../formatters/jsonl.formatter';
import { CsvFormatter } from '../formatters/csv.formatter';
import { CocoFormatter } from '../formatters/coco.formatter';
import { PascalVocFormatter } from '../formatters/pascal-voc.formatter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Export, Task, Batch, Project, Annotation, AnnotationResponse, QualityCheck]),
  ],
  controllers: [ExportController],
  providers: [
    ExportService,
    ExportJobProcessor,
    ExportEventHandler,
    JsonFormatter,
    JsonlFormatter,
    CsvFormatter,
    CocoFormatter,
    PascalVocFormatter,
  ],
  exports: [ExportService],
})
export class ExportModule {}
