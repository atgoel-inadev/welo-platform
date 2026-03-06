import { IsString, IsUrl, IsArray, IsOptional, IsBoolean, ArrayNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'New endpoint URL' })
  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'] })
  url?: string;

  @ApiPropertyOptional({ description: 'Updated event subscriptions' })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events?: string[];

  @ApiPropertyOptional({ description: 'Enable or disable the webhook' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
