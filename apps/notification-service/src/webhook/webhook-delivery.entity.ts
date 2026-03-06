import { Entity, Column, Index, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('webhook_deliveries')
@Index(['webhookId'])
@Index(['createdAt'])
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'webhook_id', type: 'uuid' })
  webhookId: string;

  @Column({ type: 'text' })
  eventType: string;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'boolean' })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  responseBody: string;

  @Column({ type: 'int', default: 0 })
  attempt: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
