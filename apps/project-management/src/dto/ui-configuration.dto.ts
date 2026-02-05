import { IsNotEmpty, IsString, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating UI configuration
 */
export class CreateUIConfigurationDto {
  @ApiProperty({ description: 'Name of the UI configuration' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the UI configuration' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'UI configuration object',
    example: {
      id: 'ui-config-1',
      version: '1.0.0',
      name: 'Text Annotation UI',
      fileType: 'TEXT',
      responseType: 'TEXT',
      widgets: [
        {
          id: 'file-viewer-1',
          type: 'FILE_VIEWER',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 300 },
          order: 0,
        },
        {
          id: 'text-input-1',
          type: 'TEXT_INPUT',
          label: 'Enter annotation',
          required: true,
          position: { x: 0, y: 320 },
          size: { width: 100, height: 40 },
          order: 1,
        },
      ],
    },
  })
  @IsNotEmpty()
  @IsObject()
  configuration: {
    id?: string;
    version?: string;
    name: string;
    description?: string;
    fileType: 'TEXT' | 'MARKDOWN' | 'HTML' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'CSV' | 'PDF';
    responseType: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'RATING' | 'BOOLEAN' | 'NUMBER' | 'DATE' | 'STRUCTURED';
    widgets: Array<{
      id: string;
      type: string;
      label?: string;
      placeholder?: string;
      helpText?: string;
      required?: boolean;
      disabled?: boolean;
      hidden?: boolean;
      validation?: Array<{
        type: string;
        value: any;
        message: string;
      }>;
      conditionalDisplay?: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
      pipelineModes?: Array<'ANNOTATION' | 'REVIEW' | 'QUALITY_CHECK'>;
      position: {
        x: number;
        y: number;
      };
      size: {
        width: number;
        height: number;
      };
      style?: Record<string, any>;
      order: number;
      [key: string]: any; // Allow widget-specific properties
    }>;
    layout?: {
      type: 'GRID' | 'FLEX' | 'ABSOLUTE';
      columns?: number;
      gap?: number;
      padding?: number;
    };
    styles?: {
      theme?: 'LIGHT' | 'DARK';
      primaryColor?: string;
      accentColor?: string;
      fontFamily?: string;
      customCSS?: string;
    };
    behaviors?: {
      autoSave?: boolean;
      autoSaveInterval?: number;
      enableKeyboardShortcuts?: boolean;
      showProgress?: boolean;
      allowSkip?: boolean;
    };
    metadata?: {
      createdBy?: string;
      createdAt?: string;
      updatedBy?: string;
      updatedAt?: string;
      tags?: string[];
    };
  };
}

/**
 * DTO for updating UI configuration
 */
export class UpdateUIConfigurationDto extends CreateUIConfigurationDto {}

/**
 * Response DTO for UI configuration
 */
export class UIConfigurationResponseDto {
  @ApiProperty({ description: 'Configuration ID (same as project ID)' })
  id: string;

  @ApiProperty({ description: 'Configuration version' })
  version: string;

  @ApiProperty({ description: 'Configuration name' })
  name: string;

  @ApiPropertyOptional({ description: 'Configuration description' })
  description?: string;

  @ApiProperty({ description: 'UI configuration object' })
  configuration: any;

  @ApiProperty({ description: 'Project ID this configuration belongs to' })
  projectId: string;

  @ApiProperty({ description: 'User who created this configuration' })
  createdBy: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Configuration metadata' })
  metadata?: {
    totalWidgets: number;
    fileType: string;
    responseType: string;
    pipelineModes: string[];
  };
}

/**
 * Response DTO for version history
 */
export class UIConfigurationVersionDto {
  @ApiProperty({ description: 'Version number' })
  version: string;

  @ApiPropertyOptional({ description: 'Version description' })
  description?: string;

  @ApiProperty({ description: 'User who created this version' })
  createdBy: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Total widgets in this version' })
  totalWidgets: number;
}
