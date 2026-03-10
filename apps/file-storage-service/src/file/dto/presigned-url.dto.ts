import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsNotEmpty } from 'class-validator';

export class PresignedUrlDto {
  @ApiProperty({ example: 'image_001.jpg', description: 'Original file name including extension' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'image/jpeg', description: 'MIME type of the file to be uploaded' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ format: 'uuid', description: 'Project this file belongs to' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Batch this file belongs to (optional)' })
  @IsOptional()
  @IsUUID()
  batchId?: string;
}
