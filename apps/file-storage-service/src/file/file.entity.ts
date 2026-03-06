import { Entity, Column, Index, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export enum FileStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  VIRUS_DETECTED = 'VIRUS_DETECTED',
  DELETED = 'DELETED',
}

@Entity('files')
@Index(['projectId'])
@Index(['batchId'])
@Index(['status'])
@Index(['uploadedBy'])
export class FileRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'batch_id', type: 'uuid', nullable: true })
  batchId: string;

  @Column({ name: 'original_name', length: 512 })
  originalName: string;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey: string;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @Column({ name: 'mime_type', length: 127 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'file_type', length: 50 })
  fileType: string;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string;

  @Column({ type: 'enum', enum: FileStatus, default: FileStatus.PENDING })
  status: FileStatus;

  @Column({ name: 'virus_scan_result', type: 'text', nullable: true })
  virusScanResult: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
