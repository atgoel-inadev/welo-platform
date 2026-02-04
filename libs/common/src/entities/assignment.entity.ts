import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AssignmentStatus, AssignmentMethod, WorkflowStage } from '../enums';
import { Task } from './task.entity';
import { User } from './user.entity';
import { Annotation } from './annotation.entity';

@Entity('assignments')
@Index(['taskId'])
@Index(['userId'])
@Index(['status'])
@Index(['assignedAt'])
@Index(['userId', 'status', 'assignedAt'])
export class Assignment extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'workflow_stage', type: 'enum', enum: WorkflowStage })
  workflowStage: WorkflowStage;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.ASSIGNED,
  })
  status: AssignmentStatus;

  @Column({ name: 'assigned_at', type: 'timestamp' })
  assignedAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'assignment_method', type: 'enum', enum: AssignmentMethod })
  assignmentMethod: AssignmentMethod;

  @Column({ name: 'assignment_order', type: 'int', default: 1 })
  assignmentOrder: number; // Order of this assignment for the task (1st annotator, 2nd annotator, etc.)

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean; // Is this the primary annotator for consensus

  @Column({ name: 'requires_consensus', type: 'boolean', default: false })
  requiresConsensus: boolean; // Does this assignment require consensus with others

  @Column({ name: 'consensus_group_id', type: 'uuid', nullable: true })
  consensusGroupId: string; // Group ID for assignments that need to reach consensus

  // Relations
  @ManyToOne(() => Task, (task) => task.assignments)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User, (user) => user.assignments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Annotation, (annotation) => annotation.assignment)
  annotations: Annotation[];
}
