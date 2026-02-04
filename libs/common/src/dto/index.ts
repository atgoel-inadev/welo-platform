import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page_size?: number = 50;
}

export class ResponseDto<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    request_id: string;
  };

  constructor(data?: T, success: boolean = true) {
    this.success = success;
    this.data = data;
    this.metadata = {
      timestamp: new Date().toISOString(),
      request_id: generateRequestId(),
    };
  }
}

export class PaginatedResponseDto<T> extends ResponseDto<T[]> {
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };

  constructor(
    data: T[],
    page: number,
    pageSize: number,
    totalItems: number,
  ) {
    super(data);
    const totalPages = Math.ceil(totalItems / pageSize);
    this.pagination = {
      page,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_previous: page > 1,
    };
  }
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
