import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { QualityCheckType, QualityCheckStatus, IssueSeverity } from '../enums';
import { Task } from './task.entity';
import { Annotation } from './annotation.entity';
import { User } from './user.entity';

@Entity('quality_checks')
@Index(['taskId'])
@Index(['annotationId'])
@Index(['reviewerId'])
@Index(['checkType'])
@Index(['status'])
export class QualityCheck extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'annotation_id', type: 'uuid' })
  annotationId: string;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId: string;

  @Column({ name: 'check_type', type: 'enum', enum: QualityCheckType })
  checkType: QualityCheckType;

  @Column({ type: 'enum', enum: QualityCheckStatus })
  status: QualityCheckStatus;

  @Column({ name: 'quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  qualityScore: number;

  @Column({ type: 'jsonb', nullable: true })
  issues: Array<{
    category: string;
    severity: IssueSeverity;
    description: string;
    location: Record<string, any>;
  }>;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ name: 'corrected_annotation_id', type: 'uuid', nullable: true })
  correctedAnnotationId: string;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string;

  // Relations
  @ManyToOne(() => Task, (task) => task.qualityChecks)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Annotation, (annotation) => annotation.qualityChecks)
  @JoinColumn({ name: 'annotation_id' })
  annotation: Annotation;

  @ManyToOne(() => User, (user) => user.qualityChecks)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @ManyToOne(() => Annotation)
  @JoinColumn({ name: 'corrected_annotation_id' })
  correctedAnnotation: Annotation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;
}
