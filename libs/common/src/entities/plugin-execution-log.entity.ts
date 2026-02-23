import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('plugin_execution_logs')
@Index(['projectId'])
@Index(['taskId'])
@Index(['pluginId'])
@Index(['result'])
export class PluginExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plugin_id', length: 255 })
  pluginId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId: string;

  @Column({ name: 'question_id', length: 255, nullable: true })
  questionId: string;

  @Column({ length: 20, nullable: true })
  result: string; // PASS | WARN | FAIL | ERROR | TIMEOUT

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'execution_time_ms', type: 'int', nullable: true })
  executionTimeMs: number;

  @Column({ name: 'http_status', type: 'int', nullable: true })
  httpStatus: number;

  @Column({ name: 'error_detail', type: 'text', nullable: true })
  errorDetail: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
