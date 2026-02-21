import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Annotation } from './annotation.entity';
import { User } from './user.entity';

@Entity('annotation_versions')
@Index(['annotationId'])
@Index(['annotationId', 'version'])
export class AnnotationVersion extends BaseEntity {
  @Column({ name: 'annotation_id', type: 'uuid' })
  annotationId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ name: 'annotation_data', type: 'jsonb' })
  annotationData: {
    labels?: any[];
    spans?: any[];
    entities?: any[];
    relationships?: any[];
    attributes?: Record<string, any>;
    freeText?: string;
  };

  @Column({ name: 'confidence_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidenceScore: number;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedBy: string;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  changeReason: string;

  // Relations
  @ManyToOne(() => Annotation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'annotation_id' })
  annotation: Annotation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User;
}
