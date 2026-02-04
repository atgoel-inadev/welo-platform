import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CommentEntityType } from '../enums';
import { User } from './user.entity';

@Entity('comments')
export class Comment extends BaseEntity {
  @Column({ name: 'entity_type', type: 'enum', enum: CommentEntityType })
  entityType: CommentEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'parent_comment_id', type: 'uuid', nullable: true })
  parentCommentId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: any[];

  @Column({ name: 'is_resolved', type: 'boolean', default: false })
  isResolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Comment, (comment) => comment.replies)
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment: Comment;

  @OneToMany(() => Comment, (comment) => comment.parentComment)
  replies: Comment[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;
}
