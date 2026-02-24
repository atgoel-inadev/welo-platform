import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';

export class CreateBatchDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003', description: 'Project ID this batch belongs to' })
  @IsNotEmpty({ message: 'Project ID is required' })
  @IsUUID('4', { message: 'Project ID must be a valid UUID' })
  projectId: string;

  @ApiProperty({ example: 'Batch 1 - Initial Data', description: 'Batch name' })
  @IsNotEmpty({ message: 'Batch name is required' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'First batch of training data', description: 'Batch description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 5, description: 'Priority level (1=lowest, 10=highest)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ example: '2025-04-30', description: 'Batch due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'Batch configuration',
    example: { assignmentRules: { method: 'ROUND_ROBIN' }, validationRules: { minAnnotations: 2 } },
  })
  configuration?: {
    assignmentRules?: any;
    validationRules?: any;
    exportSettings?: any;
  };
}

export class UpdateBatchDto {
  @ApiPropertyOptional({ example: 'Batch 1 - Updated', description: 'Batch name' })
  name?: string;

  @ApiPropertyOptional({ example: 'Updated batch description' })
  description?: string;

  @ApiPropertyOptional({ example: 'IN_PROGRESS', description: 'Batch status' })
  status?: string;

  @ApiPropertyOptional({ example: 7, description: 'Priority level' })
  priority?: number;

  @ApiPropertyOptional({ example: '2025-05-15', description: 'Updated due date' })
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Batch configuration' })
  configuration?: {
    assignmentRules?: any;
    validationRules?: any;
    exportSettings?: any;
  };
}

export class AllocateFilesDto {
  @ApiProperty({
    description: 'Array of files to allocate as tasks',
    example: [
      {
        externalId: 'file-001',
        fileType: 'CSV',
        fileUrl: 'https://storage.example.com/files/data.csv',
        fileName: 'data.csv',
        fileSize: 1024,
      },
    ],
  })
  files: Array<{
    externalId: string;
    fileType: string; // CSV, TXT, IMAGE, VIDEO, AUDIO, PDF
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
    metadata?: any;
  }>;

  @ApiPropertyOptional({ example: 'ANNOTATION', description: 'Task type to create' })
  taskType?: string;

  @ApiPropertyOptional({ example: 5, description: 'Priority for created tasks' })
  priority?: number;

  @ApiPropertyOptional({ example: '2025-04-30', description: 'Due date for created tasks' })
  dueDate?: Date;

  @ApiPropertyOptional({
    enum: ['MANUAL', 'AUTO_ROUND_ROBIN', 'AUTO_SKILL_BASED', 'AUTO_WORKLOAD_BASED'],
    example: 'AUTO_ROUND_ROBIN',
    description: 'Assignment method',
  })
  assignmentMethod?: 'MANUAL' | 'AUTO_ROUND_ROBIN' | 'AUTO_SKILL_BASED' | 'AUTO_WORKLOAD_BASED';

  @ApiPropertyOptional({ example: true, description: 'Whether to auto-assign tasks immediately' })
  autoAssign?: boolean;
}

export class AllocateFolderDto {
  @ApiProperty({ example: '/data/uploads/batch1', description: 'Path to folder containing files' })
  folderPath: string;

  @ApiPropertyOptional({ example: '*.csv', description: 'Glob pattern to filter files' })
  filePattern?: string; // e.g., "*.csv", "*.jpg"

  @ApiPropertyOptional({ example: true, description: 'Whether to scan subdirectories' })
  recursive?: boolean;

  @ApiPropertyOptional({ example: 'ANNOTATION', description: 'Task type' })
  taskType?: string;

  @ApiPropertyOptional({ example: 5, description: 'Priority for created tasks' })
  priority?: number;

  @ApiPropertyOptional({ example: '2025-04-30', description: 'Due date for created tasks' })
  dueDate?: Date;

  @ApiPropertyOptional({
    enum: ['MANUAL', 'AUTO_ROUND_ROBIN', 'AUTO_SKILL_BASED', 'AUTO_WORKLOAD_BASED'],
    example: 'AUTO_ROUND_ROBIN',
  })
  assignmentMethod?: 'MANUAL' | 'AUTO_ROUND_ROBIN' | 'AUTO_SKILL_BASED' | 'AUTO_WORKLOAD_BASED';

  @ApiPropertyOptional({ example: false })
  autoAssign?: boolean;
}

export class ScanDirectoryDto {
  directoryPath?: string; // Optional: defaults to /media/{projectId}/{batchName}
  filePattern?: string; // e.g., "*.jpg", "*.mp4" - defaults to all files
  taskType?: string;
  autoAssign?: boolean;
  assignmentMethod?: 'MANUAL' | 'AUTO_ROUND_ROBIN' | 'AUTO_SKILL_BASED' | 'AUTO_WORKLOAD_BASED';
}

export class AssignTaskDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440021', description: 'Task ID to assign' })
  taskId: string;

  @ApiPropertyOptional({ example: '650e8400-e29b-41d4-a716-446655440010', description: 'User ID (omit for auto-assignment)' })
  userId?: string; // Optional: if not provided, uses auto-assignment

  @ApiPropertyOptional({ example: 'ANNOTATION', description: 'Workflow stage' })
  workflowStage?: string;

  @ApiPropertyOptional({ example: 28800, description: 'Assignment expiration in seconds (default 8h)' })
  expiresIn?: number; // Seconds
}

export class PullNextTaskDto {
  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440010', description: 'User requesting next task' })
  userId: string;

  @ApiPropertyOptional({ example: 'queue-1', description: 'Queue ID to pull from' })
  queueId?: string;

  @ApiPropertyOptional({ example: 'ANNOTATION', description: 'Task type filter' })
  taskType?: string;
}

export class BatchStatisticsDto {
  @ApiProperty({ example: '750e8400-e29b-41d4-a716-446655440001' })
  batchId: string;

  @ApiProperty({ example: 100 })
  totalTasks: number;

  @ApiProperty({ example: 45 })
  completedTasks: number;

  @ApiProperty({ example: 20 })
  inProgressTasks: number;

  @ApiProperty({ example: 30 })
  queuedTasks: number;

  @ApiProperty({ example: 5 })
  failedTasks: number;

  @ApiProperty({ example: 45.0, description: 'Completion percentage' })
  completionPercentage: number;

  @ApiProperty({ example: 120, description: 'Average task duration in seconds' })
  averageTaskDuration: number;

  @ApiProperty({ example: 0.92, description: 'Aggregate quality score' })
  qualityScore: number;

  @ApiProperty({
    description: 'Breakdown by assignment method',
    example: { manual: 10, autoAssigned: 55, unassigned: 35 },
  })
  assignmentBreakdown: {
    manual: number;
    autoAssigned: number;
    unassigned: number;
  };
}
