import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';
import { Annotation } from './annotation.entity';
import { Assignment } from './assignment.entity';

@Entity('annotation_responses')
@Index(['taskId'])
@Index(['annotationId'])
@Index(['assignmentId'])
@Index(['questionId'])
export class AnnotationResponse extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'annotation_id', type: 'uuid' })
  annotationId: string;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @Column({ name: 'question_id', length: 255 })
  questionId: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ name: 'question_type', length: 50 })
  questionType: string; // MULTI_SELECT, TEXT, SINGLE_SELECT, NUMBER, DATE

  @Column({ type: 'jsonb' })
  response: {
    value: any; // Can be string, number, array of strings, date, etc.
    selectedOptions?: Array<{ id: string; label: string; value: string }>;
    textValue?: string;
    numberValue?: number;
    dateValue?: string;
  };

  @Column({ name: 'time_spent', type: 'int', nullable: true })
  timeSpent: number; // Seconds spent on this question

  @Column({ name: 'confidence_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  confidenceScore: number; // 0-100

  @Column({ name: 'is_skipped', type: 'boolean', default: false })
  isSkipped: boolean;

  @Column({ name: 'skip_reason', type: 'text', nullable: true })
  skipReason: string;

  // Relations
  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Annotation, (annotation) => annotation.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'annotation_id' })
  annotation: Annotation;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;
}
