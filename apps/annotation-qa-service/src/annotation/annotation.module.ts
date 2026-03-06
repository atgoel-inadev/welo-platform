import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Annotation, AnnotationVersion, Task } from '@app/common';
import { AnnotationController } from './annotation.controller';
import { AnnotationService } from './annotation.service';
import { AnnotationEventHandler } from './annotation-event.handler';
import { QualityCheckModule } from '../quality-check/quality-check.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Annotation, AnnotationVersion, Task]),
    forwardRef(() => QualityCheckModule),
  ],
  controllers: [AnnotationController],
  providers: [AnnotationService, AnnotationEventHandler],
  exports: [AnnotationService],
})
export class AnnotationModule {}
