import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TaskType, TaskStatus } from '../enums';
import { Batch } from './batch.entity';
import { Project } from './project.entity';
import { Workflow } from './workflow.entity';
import { Assignment } from './assignment.entity';
import { Annotation } from './annotation.entity';
import { QualityCheck } from './quality-check.entity';
import { ReviewApproval } from './review-approval.entity';
import { AnnotationResponse } from './annotation-response.entity';

@Entity('tasks')
@Index(['batchId'])
@Index(['projectId'])
@Index(['workflowId'])
@Index(['status'])
@Index(['priority'])
@Index(['assignedAt'])
@Index(['dueDate'])
@Index(['stateUpdatedAt'])
@Index(['projectId', 'status', 'priority'])
export class Task extends BaseEntity {
  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId: string;

  @Column({ name: 'external_id', length: 255 })
  externalId: string;

  @Column({ name: 'task_type', type: 'enum', enum: TaskType })
  taskType: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.QUEUED })
  status: TaskStatus;

  @Column({ type: 'int', default: 5 })
  priority: number;

  @Column({ name: 'machine_state', type: 'jsonb' })
  machineState: {
    value: string | Record<string, any>;
    context: Record<string, any>;
    history?: Record<string, any>;
    done: boolean;
    changed: boolean;
    tags?: string[];
  };

  @Column({ name: 'previous_state', type: 'jsonb', nullable: true })
  previousState: Record<string, any>;

  @Column({ name: 'state_updated_at', type: 'timestamp', nullable: true })
  stateUpdatedAt: Date;

  @Column({ name: 'data_payload', type: 'jsonb' })
  dataPayload: {
    sourceData: Record<string, any>;
    references: any[];
    context: Record<string, any>;
  };

  @Column({ name: 'assignment_id', type: 'uuid', nullable: true })
  assignmentId: string;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ name: 'estimated_duration', type: 'int', nullable: true })
  estimatedDuration: number;

  @Column({ name: 'actual_duration', type: 'int', nullable: true })
  actualDuration: number;

  @Column({ name: 'file_type', length: 50, nullable: true })
  fileType: string; // CSV, TXT, IMAGE, VIDEO, AUDIO, PDF

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string; // URL to the file to be annotated

  @Column({ name: 'file_metadata', type: 'jsonb', nullable: true })
  fileMetadata: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    dimensions?: { width: number; height: number };
    duration?: number; // For video/audio
  };

  @Column({ name: 'requires_consensus', type: 'boolean', default: false })
  requiresConsensus: boolean;

  @Column({ name: 'consensus_reached', type: 'boolean', default: false })
  consensusReached: boolean;

  @Column({ name: 'consensus_score', type: 'numeric', precision: 5, scale: 2, nullable: true })
  consensusScore: number; // 0-100, percentage of agreement

  @Column({ name: 'current_review_level', type: 'int', default: 0 })
  currentReviewLevel: number; // 0 = annotation, 1+ = review levels

  @Column({ name: 'max_review_level', type: 'int', default: 0 })
  maxReviewLevel: number; // Total number of review levels configured

  @Column({ name: 'all_reviews_approved', type: 'boolean', default: false })
  allReviewsApproved: boolean;

  @Column({ name: 'total_assignments_required', type: 'int', default: 1 })
  totalAssignmentsRequired: number; // How many annotators should work on this

  @Column({ name: 'completed_assignments', type: 'int', default: 0 })
  completedAssignments: number; // How many have completed

  @Column({ name: 'annotation_responses', type: 'jsonb', nullable: true })
  annotationResponses: Array<{
    questionId: string;
    response: any;
    timestamp: string;
    annotatorId: string;
  }>;

  @Column({ name: 'extra_widget_data', type: 'jsonb', nullable: true })
  extraWidgetData: Record<string, any>;

  @Column({ name: 'review_data', type: 'jsonb', nullable: true })
  reviewData: Array<{
    reviewLevel: number;
    reviewerId: string;
    decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
    qualityScore?: number;
    comments?: string;
    extraWidgetData?: Record<string, any>;
    timestamp: string;
  }>;

  // Relations
  @ManyToOne(() => Batch, (batch) => batch.tasks)
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @ManyToOne(() => Project, (project) => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Workflow, (workflow) => workflow.tasks)
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @OneToMany(() => Assignment, (assignment) => assignment.task)
  assignments: Assignment[];

  @OneToMany(() => Annotation, (annotation) => annotation.task)
  annotations: Annotation[];

  @OneToMany(() => QualityCheck, (qualityCheck) => qualityCheck.task)
  qualityChecks: QualityCheck[];

  @OneToMany(() => ReviewApproval, (review) => review.task)
  reviewApprovals: ReviewApproval[];

  @OneToMany(() => AnnotationResponse, (response) => response.task)
  responses: AnnotationResponse[];
}
