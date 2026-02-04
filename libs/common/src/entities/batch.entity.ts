import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { BatchStatus } from '../enums';
import { Project } from './project.entity';
import { Task } from './task.entity';
import { Export } from './export.entity';
import { WorkflowInstance } from './workflow-instance.entity';

@Entity('batches')
@Index(['projectId'])
@Index(['status'])
@Index(['priority'])
@Index(['dueDate'])
export class Batch extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.CREATED })
  status: BatchStatus;

  @Column({ type: 'int', default: 5 })
  priority: number;

  @Column({ name: 'total_tasks', type: 'int', default: 0 })
  totalTasks: number;

  @Column({ name: 'completed_tasks', type: 'int', default: 0 })
  completedTasks: number;

  @Column({ name: 'quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  qualityScore: number;

  @Column({ type: 'jsonb', nullable: true })
  configuration: {
    assignmentRules: Record<string, any>;
    validationRules: Record<string, any>;
    exportSettings: Record<string, any>;
  };

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.batches)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => Task, (task) => task.batch)
  tasks: Task[];

  @OneToMany(() => Export, (exportRecord) => exportRecord.batch)
  exports: Export[];

  @OneToMany(() => WorkflowInstance, (instance) => instance.batch)
  workflowInstances: WorkflowInstance[];
}
