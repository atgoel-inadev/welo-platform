import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';
import { Assignment } from './assignment.entity';
import { User } from './user.entity';
import { QualityCheck } from './quality-check.entity';
import { AnnotationResponse } from './annotation-response.entity';

@Entity('annotations')
@Index(['taskId'])
@Index(['userId'])
@Index(['submittedAt'])
@Index(['isFinal'])
@Index(['taskId', 'version'])
export class Annotation extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'annotation_data', type: 'jsonb' })
  annotationData: {
    labels?: any[];
    spans?: any[];
    entities?: any[];
    relationships?: any[];
    attributes?: Record<string, any>;
    freeText?: string;
  };

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_final', type: 'boolean', default: false })
  isFinal: boolean;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidenceScore: number;

  @Column({ name: 'time_spent', type: 'int', nullable: true })
  timeSpent: number;

  @Column({ name: 'tool_version', length: 50, nullable: true })
  toolVersion: string;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  // Relations
  @ManyToOne(() => Task, (task) => task.annotations)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Assignment, (assignment) => assignment.annotations)
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @ManyToOne(() => User, (user) => user.annotations)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => QualityCheck, (qualityCheck) => qualityCheck.annotation)
  qualityChecks: QualityCheck[];

  @OneToMany(() => AnnotationResponse, (response) => response.annotation)
  responses: AnnotationResponse[];
}
