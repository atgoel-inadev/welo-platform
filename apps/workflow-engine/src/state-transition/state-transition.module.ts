import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, Project, Assignment } from '@app/common';
import { KafkaModule } from '@app/infrastructure';
import { StateTransitionService } from './state-transition.service';
import { WorkflowEventHandler } from './workflow-event.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Project, Assignment]),
    KafkaModule,
  ],
  providers: [
    StateTransitionService,
    WorkflowEventHandler,
  ],
  exports: [StateTransitionService],
})
export class StateTransitionModule {}
