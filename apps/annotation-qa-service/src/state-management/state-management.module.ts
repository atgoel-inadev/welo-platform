import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, Project } from '@app/common';
import { StateManagementService } from './state-management.service';
import { WorkflowEngineClient } from './workflow-engine.client';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project])],
  providers: [StateManagementService, WorkflowEngineClient],
  exports: [StateManagementService],
})
export class StateManagementModule {}
