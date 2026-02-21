import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoldTask, Annotation } from '@app/common';
import { GoldTaskController } from './gold-task.controller';
import { GoldTaskService } from './gold-task.service';
import { GoldComparisonEngine } from './gold-comparison.engine';

@Module({
  imports: [TypeOrmModule.forFeature([GoldTask, Annotation])],
  controllers: [GoldTaskController],
  providers: [GoldTaskService, GoldComparisonEngine],
  exports: [GoldTaskService, GoldComparisonEngine],
})
export class GoldTaskModule {}
