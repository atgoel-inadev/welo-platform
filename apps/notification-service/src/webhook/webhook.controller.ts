import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @ApiOperation({ summary: 'List webhooks for a project' })
  @ApiQuery({ name: 'projectId', required: true, description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Webhooks retrieved' })
  async listWebhooks(@Query('projectId') projectId: string) {
    return this.webhookService.listWebhooks(projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createWebhook(@Body() dto: CreateWebhookDto) {
    return this.webhookService.createWebhook(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update webhook configuration' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async updateWebhook(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhookService.updateWebhook(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  @ApiResponse({ status: 204, description: 'Webhook deleted' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async deleteWebhook(@Param('id') id: string) {
    await this.webhookService.deleteWebhook(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a test payload to the webhook' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  @ApiResponse({ status: 200, description: 'Test delivery result' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async testWebhook(@Param('id') id: string) {
    return this.webhookService.testWebhook(id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get delivery history for a webhook (last 50)' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  @ApiResponse({ status: 200, description: 'Delivery history retrieved' })
  async getDeliveries(@Param('id') id: string) {
    return this.webhookService.getDeliveries(id);
  }
}
