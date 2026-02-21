import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';
import { User } from './user.entity';

@Entity('project_team_members')
@Unique(['projectId', 'userId'])
@Index(['projectId'])
@Index(['userId'])
@Index(['role'])
export class ProjectTeamMember extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'role', type: 'varchar', length: 50 })
  role: string; // ANNOTATOR, REVIEWER, OPS_MANAGER, ADMIN

  @Column({ name: 'quota', type: 'int', nullable: true })
  quota: number; // Max tasks this user can be assigned in this project

  @Column({ name: 'assigned_tasks_count', type: 'int', default: 0 })
  assignedTasksCount: number;

  @Column({ name: 'completed_tasks_count', type: 'int', default: 0 })
  completedTasksCount: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'joined_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.teamMembers)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, (user) => user.projectTeamMemberships)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
