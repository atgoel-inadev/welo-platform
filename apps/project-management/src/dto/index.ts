/**
 * Workflow Stage DTO - Represents a single stage in the workflow pipeline
 * Aligned with frontend ExtendedWorkflowConfiguration.stages structure
 */
export class WorkflowStageDto {
  id: string;
  name: string;
  type: 'annotation' | 'review' | 'qa';
  annotators_count: number;
  reviewers_count?: number;
  max_rework_attempts?: number;
  require_consensus?: boolean;
  consensus_threshold?: number;
  auto_assign: boolean;
  allowed_users?: string[];
  stage_order?: number;
}

/**
 * Extended Workflow Configuration DTO - Supports stage-based workflow system
 * Maintains backward compatibility with review_levels structure
 */
export class ExtendedWorkflowConfigDto {
  // Stage-based configuration (new)
  stages?: WorkflowStageDto[];

  // Global settings
  global_max_rework_before_reassignment?: number;
  enable_quality_gates?: boolean;
  minimum_quality_score?: number;

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

  // Legacy settings (for backward compatibility)
  annotatorsPerTask?: number;
  approvalCriteria?: {
    requireAllAnnotatorConsensus: boolean;
    consensusThreshold?: number;
    qualityScoreMinimum?: number;
    autoApproveIfQualityAbove?: number;
  };
  assignmentRules?: {
    allowSelfAssignment: boolean;
    preventDuplicateAssignments: boolean;
    maxConcurrentAssignments?: number;
    assignmentTimeout?: number;
  };
}

export class CreateProjectDto {
  name: string;
  customerId: string;
  description?: string;
  projectType: string;
  createdBy: string;
  startDate?: Date;
  endDate?: Date;
  annotationSchema?: any;
  qualityThresholds?: any;
  workflowRules?: any;
  uiConfiguration?: any;
  supportedFileTypes?: string[];
  
  // Extended workflow configuration
  workflow_config?: ExtendedWorkflowConfigDto;
}

export * from './project-team.dto';
export * from './batch.dto';
export * from './ui-configuration.dto';

export class UpdateProjectDto {
  name?: string;
  description?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  configuration?: any;
  
  // Extended workflow configuration
  workflow_config?: ExtendedWorkflowConfigDto;
}

export class AddAnnotationQuestionsDto {
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
  annotatorsPerTask: number;
  reviewLevels: Array<{
    level: number;
    name: string;
    reviewersCount: number;
    requireAllApprovals: boolean;
    approvalThreshold?: number;
    autoAssign: boolean;
    allowedReviewers?: string[];
  }>;
  approvalCriteria: {
    requireAllAnnotatorConsensus: boolean;
    consensusThreshold?: number;
    qualityScoreMinimum?: number;
    autoApproveIfQualityAbove?: number;
  };
  assignmentRules: {
    allowSelfAssignment: boolean;
    preventDuplicateAssignments: boolean;
    maxConcurrentAssignments?: number;
    assignmentTimeout?: number;
  };
}
