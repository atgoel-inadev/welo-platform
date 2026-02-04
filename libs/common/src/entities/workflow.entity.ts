import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { WorkflowStatus, StateType } from '../enums';
import { Project } from './project.entity';
import { User } from './user.entity';
import { Task } from './task.entity';
import { WorkflowInstance } from './workflow-instance.entity';
import { StateTransition } from './state-transition.entity';

@Entity('workflows')
@Index(['projectId'])
@Index(['status'])
@Index(['version'])
@Index(['isTemplate'])
export class Workflow extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'xstate_definition', type: 'jsonb' })
  xstateDefinition: {
    id: string;
    initial: string;
    context?: Record<string, any>;
    states: Record<
      string,
      {
        on?: Record<string, any>;
        entry?: any[];
        exit?: any[];
        after?: Record<string, any>;
        invoke?: Record<string, any>;
        meta?: Record<string, any>;
        type?: StateType;
        states?: Record<string, any>;
      }
    >;
    guards?: Record<string, any>;
    actions?: Record<string, any>;
    services?: Record<string, any>;
    delays?: Record<string, any>;
  };

  @Column({ name: 'state_schema', type: 'jsonb', nullable: true })
  stateSchema: {
    states: Record<string, any>;
    context: Record<string, any>;
  };

  @Column({ name: 'event_schema', type: 'jsonb', nullable: true })
  eventSchema: Array<{
    eventType: string;
    payloadSchema: Record<string, any>;
    description: string;
  }>;

  @Column({ name: 'visualization_config', type: 'jsonb', nullable: true })
  visualizationConfig: {
    layout: string;
    nodePositions: Record<string, any>;
    styling: Record<string, any>;
  };

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({ name: 'is_template', type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ name: 'parent_workflow_id', type: 'uuid', nullable: true })
  parentWorkflowId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  // Relations
  @ManyToOne(() => Project, (project) => project.workflows)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => Workflow, (workflow) => workflow.childWorkflows)
  @JoinColumn({ name: 'parent_workflow_id' })
  parentWorkflow: Workflow;

  @OneToMany(() => Workflow, (workflow) => workflow.parentWorkflow)
  childWorkflows: Workflow[];

  @OneToMany(() => Task, (task) => task.workflow)
  tasks: Task[];

  @OneToMany(() => WorkflowInstance, (instance) => instance.workflow)
  instances: WorkflowInstance[];

  @OneToMany(() => StateTransition, (transition) => transition.workflow)
  stateTransitions: StateTransition[];
}
