import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ExportType, ExportFormat, ExportStatus } from '../enums';
import { Batch } from './batch.entity';
import { Project } from './project.entity';
import { User } from './user.entity';

@Entity('exports')
@Index(['batchId'])
@Index(['projectId'])
@Index(['status'])
@Index(['createdAt'])
export class Export extends BaseEntity {
  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'export_type', type: 'enum', enum: ExportType })
  exportType: ExportType;

  @Column({ type: 'enum', enum: ExportFormat })
  format: ExportFormat;

  @Column({ type: 'enum', enum: ExportStatus, default: ExportStatus.PENDING })
  status: ExportStatus;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: string;

  @Column({ name: 'record_count', type: 'int', nullable: true })
  recordCount: number;

  @Column({ name: 'filter_criteria', type: 'jsonb', nullable: true })
  filterCriteria: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  configuration: {
    includeMetadata: boolean;
    includeQualityMetrics: boolean;
    anonymize: boolean;
    compression: string;
  };

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy: string;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  // Relations
  @ManyToOne(() => Batch, (batch) => batch.exports)
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by' })
  requester: User;
}
