import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, Batch, Project, StateTransition } from '@app/common';
import { ProjectAnalyticsController } from './project-analytics.controller';
import { ProjectAnalyticsService } from './project-analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Batch, Project, StateTransition])],
  controllers: [ProjectAnalyticsController],
  providers: [ProjectAnalyticsService],
  exports: [ProjectAnalyticsService],
})
export class ProjectAnalyticsModule {}
