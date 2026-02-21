import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserRole, UserStatus, SkillProficiency } from '../enums';
import { Assignment } from './assignment.entity';
import { Annotation } from './annotation.entity';
import { QualityCheck } from './quality-check.entity';
import { AuditLog } from './audit-log.entity';
import { Notification } from './notification.entity';
import { StateTransition } from './state-transition.entity';
import { ProjectTeamMember } from './project-team-member.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
@Index(['role'])
@Index(['status'])
export class User extends BaseEntity {
  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'jsonb', nullable: true })
  skills: Array<{
    skillName: string;
    proficiency: SkillProficiency;
    certifiedAt: Date;
  }>;

  @Column({ type: 'jsonb', name: 'performance_metrics', nullable: true })
  performanceMetrics: {
    tasksCompleted: number;
    averageQuality: number;
    averageSpeed: number;
    accuracyRate: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  availability: {
    timezone: string;
    workingHours: Record<string, any>;
    capacity: number;
  };

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  // Relations
  @OneToMany(() => Assignment, (assignment) => assignment.user)
  assignments: Assignment[];

  @OneToMany(() => Annotation, (annotation) => annotation.user)
  annotations: Annotation[];

  @OneToMany(() => QualityCheck, (qualityCheck) => qualityCheck.reviewer)
  qualityChecks: QualityCheck[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => StateTransition, (stateTransition) => stateTransition.user)
  stateTransitions: StateTransition[];

  @OneToMany(() => ProjectTeamMember, (teamMember) => teamMember.user)
  projectTeamMemberships: ProjectTeamMember[];
}
