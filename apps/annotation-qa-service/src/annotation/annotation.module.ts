import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Annotation, AnnotationVersion, Task, Assignment } from '@app/common';
import { AnnotationController } from './annotation.controller';
import { AnnotationService } from './annotation.service';
import { QualityCheckModule } from '../quality-check/quality-check.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Annotation, AnnotationVersion, Task, Assignment]),
    forwardRef(() => QualityCheckModule),
  ],
  controllers: [AnnotationController],
  providers: [AnnotationService],
  exports: [AnnotationService],
})
export class AnnotationModule {}
