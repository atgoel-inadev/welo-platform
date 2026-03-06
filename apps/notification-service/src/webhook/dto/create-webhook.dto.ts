import { IsString, IsUrl, IsArray, IsOptional, ArrayNotEmpty, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KAFKA_TOPICS } from '@app/common';

const ALLOWED_EVENTS = [...Object.values(KAFKA_TOPICS), '*'] as string[];

export class CreateWebhookDto {
  @ApiProperty({ description: 'Project UUID this webhook belongs to' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'HTTPS endpoint to deliver events to' })
  @IsUrl({ protocols: ['https', 'http'] })
  url: string;

  @ApiProperty({
    description: 'List of event types to subscribe to. Use "*" for all events.',
    example: ['task.assigned', 'batch.completed', 'export.completed'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ALLOWED_EVENTS, { each: true })
  events: string[];

  @ApiPropertyOptional({ description: 'HMAC-SHA256 signing secret (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  secret?: string;
}
