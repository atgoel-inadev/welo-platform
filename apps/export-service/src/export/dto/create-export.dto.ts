import { IsUUID, IsEnum, IsOptional, IsObject, IsArray, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportType, ExportFormat } from '@app/common';

export class ExportFilterCriteriaDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  taskStatus?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  annotatorIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  dateRange?: { from: string; to: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minQualityScore?: number;
}

export class ExportConfigurationDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean = true;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  includeQualityMetrics?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  anonymize?: boolean = false;

  @ApiPropertyOptional({ enum: ['none', 'gzip', 'zip'], default: 'none' })
  @IsOptional()
  compression?: 'none' | 'gzip' | 'zip' = 'none';
}

export class CreateExportDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  batchId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ enum: ExportType })
  @IsEnum(ExportType)
  exportType: ExportType;

  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiProperty({ format: 'uuid', description: 'UUID of the user requesting the export' })
  @IsUUID()
  requestedBy: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filterCriteria?: ExportFilterCriteriaDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configuration?: ExportConfigurationDto;
}
