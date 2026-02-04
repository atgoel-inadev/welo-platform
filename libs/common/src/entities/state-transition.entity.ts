import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  StateTransitionEntityType,
  TransitionType,
  EventTrigger,
  ActionType,
} from '../enums';
import { Workflow } from './workflow.entity';
import { User } from './user.entity';
import { WorkflowInstance } from './workflow-instance.entity';

@Entity('state_transitions')
@Index(['entityType'])
@Index(['entityId'])
@Index(['workflowId'])
@Index(['createdAt'])
@Index(['userId'])
@Index(['entityType', 'entityId', 'createdAt'])
export class StateTransition extends BaseEntity {
  @Column({ name: 'entity_type', type: 'enum', enum: StateTransitionEntityType })
  entityType: StateTransitionEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId: string;

  @Column({ name: 'workflow_instance_id', type: 'uuid', nullable: true })
  workflowInstanceId: string;

  @Column({ type: 'jsonb' })
  event: {
    type: string;
    payload: Record<string, any>;
    timestamp: Date;
    origin: string;
  };

  @Column({ name: 'from_state', type: 'jsonb' })
  fromState: {
    value: string | Record<string, any>;
    context: Record<string, any>;
    tags?: string[];
  };

  @Column({ name: 'to_state', type: 'jsonb' })
  toState: {
    value: string | Record<string, any>;
    context: Record<string, any>;
    tags?: string[];
  };

  @Column({ name: 'transition_type', type: 'enum', enum: TransitionType })
  transitionType: TransitionType;

  @Column({ name: 'guards_evaluated', type: 'jsonb', nullable: true })
  guardsEvaluated: Array<{
    guardName: string;
    result: boolean;
    condition: string;
  }>;

  @Column({ name: 'actions_executed', type: 'jsonb', nullable: true })
  actionsExecuted: Array<{
    actionName: string;
    actionType: ActionType;
    executionTime: number;
    result: Record<string, any>;
  }>;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @Column({ name: 'triggered_by', type: 'enum', enum: EventTrigger })
  triggeredBy: EventTrigger;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({ name: 'is_automatic', type: 'boolean', default: false })
  isAutomatic: boolean;

  @Column({ type: 'jsonb', nullable: true })
  error: {
    message: string;
    stack: string;
    code: string;
  };

  // Relations
  @ManyToOne(() => Workflow, (workflow) => workflow.stateTransitions)
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @ManyToOne(() => User, (user) => user.stateTransitions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => WorkflowInstance, (instance) => instance.stateTransitions)
  @JoinColumn({ name: 'workflow_instance_id' })
  workflowInstance: WorkflowInstance;
}
