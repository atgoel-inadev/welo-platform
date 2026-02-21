import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('gold_tasks')
@Index(['taskId'], { unique: true })
@Index(['projectId'])
export class GoldTask extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'gold_annotation', type: 'jsonb' })
  goldAnnotation: {
    labels?: any[];
    spans?: any[];
    entities?: any[];
    relationships?: any[];
    attributes?: Record<string, any>;
    freeText?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  tolerance: {
    boundaryIouThreshold?: number;
    labelExactMatch?: boolean;
    attributeMatch?: 'exact' | 'partial' | 'none';
    scoreWeights?: {
      labelF1?: number;
      boundaryIou?: number;
      attributeMatch?: number;
    };
  };

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
