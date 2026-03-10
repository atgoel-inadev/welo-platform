import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';

/**
 * Optional metadata the client may send after completing a client-side S3 PUT.
 * The file record is identified by the URL param :id — no required fields here.
 */
export class ConfirmUploadDto {
  @ApiPropertyOptional({ description: 'Actual file size in bytes (reported by client after upload)' })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'ETag returned by S3 after the PUT' })
  @IsOptional()
  @IsString()
  etag?: string;
}
