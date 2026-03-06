import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, randomBytes } from 'crypto';
import { Webhook } from './webhook.entity';
import { WebhookDelivery } from './webhook-delivery.entity';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
  ) {}

  async listWebhooks(projectId: string): Promise<Webhook[]> {
    return this.webhookRepo.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async createWebhook(dto: { projectId: string; url: string; events: string[]; secret?: string }): Promise<Webhook> {
    const webhook = this.webhookRepo.create({
      projectId: dto.projectId,
      url: dto.url,
      events: dto.events,
      secret: dto.secret ?? randomBytes(32).toString('hex'),
      isActive: true,
      failureCount: 0,
    });
    return this.webhookRepo.save(webhook);
  }

  async updateWebhook(id: string, dto: { url?: string; events?: string[]; isActive?: boolean }): Promise<Webhook> {
    const webhook = await this.webhookRepo.findOne({ where: { id } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} not found`);
    Object.assign(webhook, dto);
    return this.webhookRepo.save(webhook);
  }

  async deleteWebhook(id: string): Promise<void> {
    const webhook = await this.webhookRepo.findOne({ where: { id } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} not found`);
    await this.webhookRepo.remove(webhook);
  }

  async dispatchEvent(projectId: string, eventType: string, payload: any): Promise<void> {
    const webhooks = await this.webhookRepo.find({ where: { projectId, isActive: true } });
    const matching = webhooks.filter((w) => w.events.includes(eventType) || w.events.includes('*'));
    if (matching.length === 0) return;

    this.logger.debug(`Dispatching ${eventType} to ${matching.length} webhook(s) for project ${projectId}`);
    await Promise.allSettled(matching.map((w) => this.deliver(w, eventType, payload)));
  }

  async deliver(webhook: Webhook, eventType: string, payload: any, attempt = 1): Promise<void> {
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

    let statusCode = 0;
    let responseBody = '';
    let success = false;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Welo-Signature': `sha256=${signature}`,
          'X-Welo-Event': eventType,
          'X-Welo-Delivery-Attempt': String(attempt),
        },
        body,
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => '');
      success = response.ok;

      if (success) {
        webhook.lastDeliveredAt = new Date();
        webhook.failureCount = 0;
        await this.webhookRepo.save(webhook);
      } else {
        await this.handleFailure(webhook, eventType, payload, attempt);
      }
    } catch (err) {
      responseBody = (err as Error).message;
      await this.handleFailure(webhook, eventType, payload, attempt);
    }

    await this.deliveryRepo.save(
      this.deliveryRepo.create({ webhookId: webhook.id, eventType, statusCode, success, responseBody, attempt }),
    );
  }

  private async handleFailure(webhook: Webhook, eventType: string, payload: any, attempt: number): Promise<void> {
    webhook.failureCount += 1;
    if (webhook.failureCount >= 5) {
      webhook.isActive = false;
      this.logger.warn(`Webhook ${webhook.id} disabled after 5 consecutive failures`);
    }
    await this.webhookRepo.save(webhook);

    // Retry with exponential backoff: 1s → 5s → 30s
    const delays = [1000, 5000, 30000];
    if (attempt <= delays.length) {
      setTimeout(() => this.deliver(webhook, eventType, payload, attempt + 1), delays[attempt - 1]);
    }
  }

  async testWebhook(id: string): Promise<{ success: boolean; statusCode?: number }> {
    const webhook = await this.webhookRepo.findOne({ where: { id } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} not found`);

    const testPayload = { event: 'webhook.test', timestamp: new Date().toISOString(), webhookId: id };
    await this.deliver(webhook, 'webhook.test', testPayload);
    const lastDelivery = await this.deliveryRepo.findOne({
      where: { webhookId: id },
      order: { createdAt: 'DESC' },
    });
    return { success: lastDelivery?.success ?? false, statusCode: lastDelivery?.statusCode };
  }

  async getDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    return this.deliveryRepo.find({
      where: { webhookId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
