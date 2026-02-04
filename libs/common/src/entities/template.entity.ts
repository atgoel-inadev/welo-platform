import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TemplateType } from '../enums';
import { User } from './user.entity';

@Entity('templates')
export class Template extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 100 })
  category: string;

  @Column({ name: 'template_type', type: 'enum', enum: TemplateType })
  templateType: TemplateType;

  @Column({ type: 'jsonb' })
  content: Record<string, any>;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount: number;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
