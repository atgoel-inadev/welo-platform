export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  metadata?: ResponseMetadata;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

export interface ResponseMetadata {
  timestamp: string;
  request_id: string;
  version?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMetadata;
}

export interface PaginationMetadata {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PaginationQuery {
  page?: number;
  page_size?: number;
}

export enum EntityType {
  TASK = 'TASK',
  BATCH = 'BATCH',
  ASSIGNMENT = 'ASSIGNMENT',
  WORKFLOW_INSTANCE = 'WORKFLOW_INSTANCE',
  PROJECT = 'PROJECT',
  ANNOTATION = 'ANNOTATION',
}

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
}
