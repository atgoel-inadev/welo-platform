import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty, IsOptional, IsEnum, IsArray, IsObject } from 'class-validator';

/**
 * Workflow Stage DTO - Represents a single stage in the workflow pipeline
 * Aligned with frontend ExtendedWorkflowConfiguration.stages structure
 */
export class WorkflowStageDto {
  @ApiProperty({ example: 'stage-1', description: 'Unique stage identifier' })
  id: string;

  @ApiProperty({ example: 'Annotation', description: 'Stage name' })
  name: string;

  @ApiProperty({ enum: ['annotation', 'review', 'qa'], example: 'annotation' })
  type: 'annotation' | 'review' | 'qa';

  @ApiProperty({ example: 3, description: 'Number of annotators for this stage' })
  annotators_count: number;

  @ApiPropertyOptional({ example: 2, description: 'Number of reviewers (review/qa stages)' })
  reviewers_count?: number;

  @ApiPropertyOptional({ example: 3, description: 'Max rework attempts before escalation' })
  max_rework_attempts?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether consensus is required' })
  require_consensus?: boolean;

  @ApiPropertyOptional({ example: 0.8, description: 'Consensus threshold (0-1)' })
  consensus_threshold?: number;

  @ApiProperty({ example: true, description: 'Whether tasks are auto-assigned' })
  auto_assign: boolean;

  @ApiPropertyOptional({ type: [String], example: ['user-1', 'user-2'], description: 'Users allowed for this stage' })
  allowed_users?: string[];

  @ApiPropertyOptional({ example: 1, description: 'Order of stage in pipeline' })
  stage_order?: number;
}

/**
 * Extended Workflow Configuration DTO - Supports stage-based workflow system
 * Maintains backward compatibility with review_levels structure
 */
export class ExtendedWorkflowConfigDto {
  @ApiPropertyOptional({ type: [WorkflowStageDto], description: 'Stage-based configuration (new)' })
  // Stage-based configuration (new)
  stages?: WorkflowStageDto[];

  @ApiPropertyOptional({ example: 5, description: 'Global max rework before reassignment' })
  // Global settings
  global_max_rework_before_reassignment?: number;

  @ApiPropertyOptional({ example: true, description: 'Enable quality gates between stages' })
  enable_quality_gates?: boolean;

  @ApiPropertyOptional({ example: 0.85, description: 'Minimum quality score (0-1)' })
  minimum_quality_score?: number;

  @ApiPropertyOptional({ description: 'Legacy review levels (backward compatibility)' })
  // Legacy review levels (for backward compatibility)
  review_levels?: Array<{
    level: number;
    name: string;
    reviewers_count: number;
    require_all_approvals: boolean;
    approval_threshold?: number;
    auto_assign: boolean;
    allowed_reviewers?: string[];
  }>;

  @ApiPropertyOptional({ example: 2, description: 'Legacy: Annotators per task' })
  // Legacy settings (for backward compatibility)
  annotatorsPerTask?: number;

  @ApiPropertyOptional({ description: 'Legacy: Approval criteria' })
  approvalCriteria?: {
    requireAllAnnotatorConsensus: boolean;
    consensusThreshold?: number;
    qualityScoreMinimum?: number;
    autoApproveIfQualityAbove?: number;
  };

  @ApiPropertyOptional({ description: 'Legacy: Assignment rules' })
  assignmentRules?: {
    allowSelfAssignment: boolean;
    preventDuplicateAssignments: boolean;
    maxConcurrentAssignments?: number;
    assignmentTimeout?: number;
  };
}

export class CreateProjectDto {
  @ApiProperty({ example: 'Podcast Transcription QA', description: 'Project name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Customer ID' })
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ example: 'Quality assurance for podcast transcriptions', description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'ANNOTATION', description: 'Project type (ANNOTATION, REVIEW, etc.)' })
  @IsNotEmpty()
  @IsString()
  projectType: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440099', description: 'User ID of creator' })
  @IsNotEmpty()
  @IsUUID()
  createdBy: string;

  @ApiPropertyOptional({ example: '2025-03-01', description: 'Project start date' })
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2025-06-30', description: 'Project end date' })
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Annotation schema definition' })
  @IsOptional()
  @IsArray()
  annotationSchema?: any;

  @ApiPropertyOptional({ description: 'Quality thresholds configuration' })
  @IsOptional()
  @IsObject()
  qualityThresholds?: any;

  @ApiPropertyOptional({ description: 'Workflow rules' })
  @IsOptional()
  @IsObject()
  workflowRules?: any;

  @ApiPropertyOptional({ description: 'UI configuration object for the annotation interface' })
  @IsOptional()
  @IsObject()
  uiConfiguration?: any;

  @ApiPropertyOptional({ type: [String], example: ['CSV', 'TXT', 'IMAGE'], description: 'Supported file types' })
  @IsOptional()
  @IsArray()
  supportedFileTypes?: string[];
  
  @ApiPropertyOptional({ type: ExtendedWorkflowConfigDto, description: 'Extended workflow configuration' })
  @IsOptional()
  @IsObject()
  // Extended workflow configuration
  workflow_config?: ExtendedWorkflowConfigDto;
}

export * from './project-team.dto';
export * from './batch.dto';
export * from './ui-configuration.dto';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Updated Project Name', description: 'Project name' })
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Project description' })
  description?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Project status' })
  status?: string;

  @ApiPropertyOptional({ example: '2025-03-01', description: 'Start date' })
  startDate?: Date;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'End date' })
  endDate?: Date;

  @ApiPropertyOptional({ description: 'General configuration object' })
  configuration?: any;
  
  @ApiPropertyOptional({ type: ExtendedWorkflowConfigDto, description: 'Extended workflow configuration' })
  // Extended workflow configuration
  workflow_config?: ExtendedWorkflowConfigDto;
}

export class AddAnnotationQuestionsDto {
  @ApiProperty({
    description: 'Array of annotation questions',
    example: [
      {
        id: 'q1',
        question: 'What sentiment does this text express?',
        questionType: 'SINGLE_SELECT',
        required: true,
        options: [
          { id: 'opt1', label: 'Positive', value: 'positive' },
          { id: 'opt2', label: 'Negative', value: 'negative' },
          { id: 'opt3', label: 'Neutral', value: 'neutral' },
        ],
      },
    ],
  })
  questions: Array<{
    id: string;
    question: string;
    questionType: 'MULTI_SELECT' | 'TEXT' | 'SINGLE_SELECT' | 'NUMBER' | 'DATE';
    required: boolean;
    options?: Array<{ id: string; label: string; value: string }>;
    validation?: {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      min?: number;
      max?: number;
    };
    dependsOn?: string;
    showWhen?: Record<string, any>;
  }>;
}

/**
 * Legacy ConfigureWorkflowDto - Maintained for backward compatibility
 * Use ExtendedWorkflowConfigDto for new stage-based workflows
 */
export class ConfigureWorkflowDto {
  @ApiProperty({ example: 2, description: 'Number of annotators per task' })
  annotatorsPerTask: number;

  @ApiProperty({
    description: 'Review levels configuration',
    example: [{ level: 1, name: 'L1 Review', reviewersCount: 1, requireAllApprovals: true, autoAssign: true }],
  })
  reviewLevels: Array<{
    level: number;
    name: string;
    reviewersCount: number;
    requireAllApprovals: boolean;
    approvalThreshold?: number;
    autoAssign: boolean;
    allowedReviewers?: string[];
  }>;

  @ApiProperty({
    description: 'Approval criteria',
    example: { requireAllAnnotatorConsensus: false, consensusThreshold: 0.8, qualityScoreMinimum: 0.7 },
  })
  approvalCriteria: {
    requireAllAnnotatorConsensus: boolean;
    consensusThreshold?: number;
    qualityScoreMinimum?: number;
    autoApproveIfQualityAbove?: number;
  };

  @ApiProperty({
    description: 'Assignment rules',
    example: { allowSelfAssignment: false, preventDuplicateAssignments: true, maxConcurrentAssignments: 5 },
  })
  assignmentRules: {
    allowSelfAssignment: boolean;
    preventDuplicateAssignments: boolean;
    maxConcurrentAssignments?: number;
    assignmentTimeout?: number;
  };
}
