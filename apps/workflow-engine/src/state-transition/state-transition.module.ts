import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, Project, Assignment } from '@app/common';
import { MessagingModule } from '@app/infrastructure';
import { StateTransitionService } from './state-transition.service';
import { WorkflowEventHandler } from './workflow-event.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Project, Assignment]),
    MessagingModule,
  ],
  providers: [
    StateTransitionService,
    WorkflowEventHandler,
  ],
  exports: [StateTransitionService],
})
export class StateTransitionModule {}
