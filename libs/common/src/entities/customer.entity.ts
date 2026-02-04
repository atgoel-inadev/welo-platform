import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CustomerStatus } from '../enums';
import { Project } from './project.entity';

@Entity('customers')
export class Customer extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  organization: string;

  @Column({ name: 'contact_email', length: 255 })
  contactEmail: string;

  @Column({ name: 'contact_phone', length: 50, nullable: true })
  contactPhone: string;

  @Column({ type: 'jsonb', name: 'billing_info', nullable: true })
  billingInfo: Record<string, any>;

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status: CustomerStatus;

  // Relations
  @OneToMany(() => Project, (project) => project.customer)
  projects: Project[];
}
