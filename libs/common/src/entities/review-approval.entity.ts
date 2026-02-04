import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';
import { User } from './user.entity';
import { Assignment } from './assignment.entity';

export enum ReviewApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}

export enum ReviewLevel {
  L1 = 1,
  L2 = 2,
  L3 = 3,
  L4 = 4,
  L5 = 5,
}

@Entity('review_approvals')
@Index(['taskId'])
@Index(['reviewerId'])
@Index(['assignmentId'])
@Index(['reviewLevel'])
@Index(['status'])
@Index(['taskId', 'reviewLevel', 'status'])
export class ReviewApproval extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId: string;

  @Column({ name: 'review_level', type: 'int' })
  reviewLevel: number;

  @Column({
    type: 'enum',
    enum: ReviewApprovalStatus,
    default: ReviewApprovalStatus.PENDING,
  })
  status: ReviewApprovalStatus;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'jsonb', nullable: true })
  feedback: {
    issues?: Array<{
      questionId: string;
      issue: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
    suggestions?: string[];
    qualityScore?: number;
  };

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'requested_changes', type: 'jsonb', nullable: true })
  requestedChanges: Array<{
    field: string;
    currentValue: any;
    suggestedValue?: any;
    reason: string;
  }>;

  // Relations
  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;
}
