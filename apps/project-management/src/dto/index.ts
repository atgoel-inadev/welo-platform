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
