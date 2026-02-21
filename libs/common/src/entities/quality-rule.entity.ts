import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';

export enum QualityRuleType {
  COMPLETENESS = 'COMPLETENESS',
  FORMAT = 'FORMAT',
  CONFIDENCE_THRESHOLD = 'CONFIDENCE_THRESHOLD',
  GOLD_MATCH = 'GOLD_MATCH',
  CUSTOM = 'CUSTOM',
}

export enum QualityRuleSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
}

@Entity('quality_rules')
@Index(['projectId'])
@Index(['projectId', 'isActive'])
export class QualityRule extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'rule_name', length: 255 })
  ruleName: string;

  @Column({ name: 'rule_type', type: 'enum', enum: QualityRuleType })
  ruleType: QualityRuleType;

  @Column({ type: 'jsonb' })
  configuration: {
    // COMPLETENESS
    requiredFields?: string[];
    minLabelCount?: number;
    // FORMAT
    allowedLabels?: string[];
    maxSpanOverlap?: boolean;
    // CONFIDENCE_THRESHOLD
    minConfidence?: number;
    // GOLD_MATCH
    minGoldSimilarity?: number;
    // CUSTOM
    expression?: string;
  };

  @Column({ type: 'enum', enum: QualityRuleSeverity, default: QualityRuleSeverity.ERROR })
  severity: QualityRuleSeverity;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'weight', type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  weight: number;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
