import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

/**
 * Used as metadata alongside multipart/form-data uploads.
 * The actual file binary is received via @UploadedFile() — not part of this DTO.
 */
export class UploadFileDto {
  @ApiProperty({ format: 'uuid', description: 'Project this file belongs to' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Batch this file belongs to (optional)' })
  @IsOptional()
  @IsUUID()
  batchId?: string;
}
