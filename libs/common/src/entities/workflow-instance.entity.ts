import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { WorkflowInstanceStatus, ActorType } from '../enums';
import { Workflow } from './workflow.entity';
import { Batch } from './batch.entity';
import { StateTransition } from './state-transition.entity';

@Entity('workflow_instances')
@Index(['workflowId'])
@Index(['batchId'])
@Index(['status'])
@Index(['actorType'])
@Index(['parentInstanceId'])
@Index(['batchId', 'status'])
export class WorkflowInstance extends BaseEntity {
  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId: string;

  @Column({ name: 'batch_id', type: 'uuid', nullable: true })
  batchId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'actor_state', type: 'jsonb' })
  actorState: {
    value: string | Record<string, any>;
    context: Record<string, any>;
    children?: Record<string, any>;
    history?: Record<string, any>;
    done: boolean;
    tags?: string[];
  };

  @Column({ name: 'parent_instance_id', type: 'uuid', nullable: true })
  parentInstanceId: string;

  @Column({ name: 'actor_type', type: 'enum', enum: ActorType })
  actorType: ActorType;

  @Column({ name: 'actor_ref_id', length: 255, nullable: true })
  actorRefId: string;

  @Column({ name: 'parallel_states', type: 'jsonb', nullable: true })
  parallelStates: {
    regions: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  snapshot: Record<string, any>;

  @Column({ name: 'checkpoint_at', type: 'timestamp', nullable: true })
  checkpointAt: Date;

  @Column({
    type: 'enum',
    enum: WorkflowInstanceStatus,
    default: WorkflowInstanceStatus.RUNNING,
  })
  status: WorkflowInstanceStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  error: Record<string, any>;

  // Relations
  @ManyToOne(() => Workflow, (workflow) => workflow.instances)
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @ManyToOne(() => Batch, (batch) => batch.workflowInstances)
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @ManyToOne(() => WorkflowInstance, (instance) => instance.childInstances)
  @JoinColumn({ name: 'parent_instance_id' })
  parentInstance: WorkflowInstance;

  @OneToMany(() => WorkflowInstance, (instance) => instance.parentInstance)
  childInstances: WorkflowInstance[];

  @OneToMany(() => StateTransition, (transition) => transition.workflowInstance)
  stateTransitions: StateTransition[];
}
