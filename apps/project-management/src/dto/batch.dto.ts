export class CreateBatchDto {
  projectId: string;
  name: string;
  description?: string;
  priority?: number;
  dueDate?: Date;
  configuration?: {
    assignmentRules?: any;
    validationRules?: any;
    exportSettings?: any;
  };
}

export class UpdateBatchDto {
  name?: string;
  description?: string;
  status?: string;
  priority?: number;
  dueDate?: Date;
  configuration?: {
    assignmentRules?: any;
    validationRules?: any;
    exportSettings?: any;
  };
}

export class AllocateFilesDto {
  files: Array<{
    externalId: string;
    fileType: string; // CSV, TXT, IMAGE, VIDEO, AUDIO, PDF
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
    metadata?: any;
  }>;
  taskType?: string;
  priority?: number;
  dueDate?: Date;
  assignmentMethod?: 'MANUAL' | 'AUTO_ROUND_ROBIN' | 'AUTO_SKILL_BASED' | 'AUTO_WORKLOAD_BASED';
  autoAssign?: boolean;
}

export class AllocateFolderDto {
  folderPath: string;
  filePattern?: string; // e.g., "*.csv", "*.jpg"
  recursive?: boolean;
  taskType?: string;
  priority?: number;
  dueDate?: Date;
  assignmentMethod?: 'MANUAL' | 'AUTO_ROUND_ROBIN' | 'AUTO_SKILL_BASED' | 'AUTO_WORKLOAD_BASED';
  autoAssign?: boolean;
}

export class AssignTaskDto {
  taskId: string;
  userId?: string; // Optional: if not provided, uses auto-assignment
  workflowStage?: string;
  expiresIn?: number; // Seconds
}

export class PullNextTaskDto {
  userId: string;
  queueId?: string;
  taskType?: string;
}

export class BatchStatisticsDto {
  batchId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  queuedTasks: number;
  failedTasks: number;
  completionPercentage: number;
  averageTaskDuration: number;
  qualityScore: number;
  assignmentBreakdown: {
    manual: number;
    autoAssigned: number;
    unassigned: number;
  };
}
