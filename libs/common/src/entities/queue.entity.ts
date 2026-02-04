import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { QueueType, QueueStatus } from '../enums';
import { Project } from './project.entity';

@Entity('queues')
@Index(['projectId'])
@Index(['queueType'])
@Index(['status'])
export class Queue extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'queue_type', type: 'enum', enum: QueueType })
  queueType: QueueType;

  @Column({ type: 'enum', enum: QueueStatus, default: QueueStatus.ACTIVE })
  status: QueueStatus;

  @Column({ name: 'priority_rules', type: 'jsonb', nullable: true })
  priorityRules: {
    priorityField: string;
    sortOrder: string;
    filters: any[];
  };

  @Column({ name: 'assignment_rules', type: 'jsonb', nullable: true })
  assignmentRules: {
    autoAssign: boolean;
    capacityLimits: Record<string, any>;
    skillRequirements: any[];
    loadBalancing: Record<string, any>;
  };

  @Column({ name: 'total_tasks', type: 'int', default: 0 })
  totalTasks: number;

  @Column({ name: 'pending_tasks', type: 'int', default: 0 })
  pendingTasks: number;

  // Relations
  @ManyToOne(() => Project, (project) => project.queues)
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
