import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AuditAction } from '../enums';
import { User } from './user.entity';

@Entity('audit_logs')
@Index(['entityType'])
@Index(['entityId'])
@Index(['userId'])
@Index(['timestamp'])
@Index(['action'])
@Index(['entityType', 'entityId', 'timestamp'])
export class AuditLog extends BaseEntity {
  @Column({ name: 'entity_type', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: {
    before: Record<string, any>;
    after: Record<string, any>;
  };

  // Relations
  @ManyToOne(() => User, (user) => user.auditLogs)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
