import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ProjectType, ProjectStatus } from '../enums';
import { Customer } from './customer.entity';
import { User } from './user.entity';
import { Workflow } from './workflow.entity';
import { Batch } from './batch.entity';
import { Task } from './task.entity';
import { Queue } from './queue.entity';

@Entity('projects')
@Index(['customerId'])
@Index(['status'])
@Index(['createdAt'])
export class Project extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'project_type', type: 'enum', enum: ProjectType })
  projectType: ProjectType;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  status: ProjectStatus;

  @Column({ name: 'default_workflow_id', type: 'uuid', nullable: true })
  defaultWorkflowId: string;

  @Column({ type: 'jsonb' })
  configuration: {
    annotationSchema: Record<string, any>;
    qualityThresholds: Record<string, any>;
    workflowRules: Record<string, any>;
    uiConfiguration: Record<string, any>;
    xstateServices?: Record<string, any>;
    xstateGuards?: Record<string, any>;
    xstateActions?: Record<string, any>;
    // Annotation questions for this project
    annotationQuestions?: Array<{
      id: string;
      question: string;
      questionType: 'MULTI_SELECT' | 'TEXT' | 'SINGLE_SELECT' | 'NUMBER' | 'DATE';
      required: boolean;
      options?: Array<{ id: string; label: string; value: string }>;
      validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        min?: number;
        max?: number;
      };
      dependsOn?: string; // Question ID that this depends on
      showWhen?: Record<string, any>; // Conditions for showing this question
    }>;
    // Workflow assignment configuration
    workflowConfiguration?: {
      // Number of annotators per task
      annotatorsPerTask: number;
      // Review levels configuration
      reviewLevels: Array<{
        level: number;
        name: string;
        reviewersCount: number; // How many reviewers at this level
        requireAllApprovals: boolean; // All reviewers must approve
        approvalThreshold?: number; // Percentage of approvals needed if not all
        autoAssign: boolean;
        allowedReviewers?: string[]; // User IDs of allowed reviewers
      }>;
      // Approval criteria
      approvalCriteria: {
        requireAllAnnotatorConsensus: boolean;
        consensusThreshold?: number; // Percentage of agreement needed
        qualityScoreMinimum?: number;
        autoApproveIfQualityAbove?: number;
      };
      // Assignment rules
      assignmentRules: {
        allowSelfAssignment: boolean;
        preventDuplicateAssignments: boolean;
        maxConcurrentAssignments?: number;
        assignmentTimeout?: number; // Minutes before assignment expires
      };
    };
    // Supported file types for this project
    supportedFileTypes?: Array<'CSV' | 'TXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF'>;
  };

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  // Relations
  @ManyToOne(() => Customer, (customer) => customer.projects)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => Workflow)
  @JoinColumn({ name: 'default_workflow_id' })
  defaultWorkflow: Workflow;

  @OneToMany(() => Batch, (batch) => batch.project)
  batches: Batch[];

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @OneToMany(() => Queue, (queue) => queue.project)
  queues: Queue[];

  @OneToMany(() => Workflow, (workflow) => workflow.project)
  workflows: Workflow[];
}
