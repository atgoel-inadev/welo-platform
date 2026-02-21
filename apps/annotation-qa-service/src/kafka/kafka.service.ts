import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, Consumer, Admin, EachMessagePayload } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'annotation-qa-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      retry: { initialRetryTime: 100, retries: 8 },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'annotation-qa-service-group' });
    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      await this.admin.connect();
      await this.createTopics();
      this.isConnected = true;
      this.logger.log('Kafka connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      await this.admin.disconnect();
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka', error);
    }
  }

  private async createTopics() {
    const topics = [
      'annotation.submitted',
      'annotation.updated',
      'annotation.draft_saved',
      'gold_comparison.completed',
      'auto_qc.passed',
      'auto_qc.failed',
      'review.submitted',
      'task.approved',
      'task.rejected_to_queue',
      'task.escalated',
      'quality_check.completed',
      'task.assigned',
      'task.state_changed',
      'notification.send',
    ];

    try {
      const existing = await this.admin.listTopics();
      const toCreate = topics.filter((t) => !existing.includes(t));
      if (toCreate.length > 0) {
        await this.admin.createTopics({
          topics: toCreate.map((topic) => ({ topic, numPartitions: 3, replicationFactor: 1 })),
        });
        this.logger.log(`Created topics: ${toCreate.join(', ')}`);
      }
    } catch (error) {
      this.logger.error('Error creating topics', error);
    }
  }

  async publish(topic: string, message: any): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Kafka not connected, skipping publish');
      return;
    }
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: message.id || Date.now().toString(),
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      });
    } catch (error) {
      this.logger.error(`Error publishing to ${topic}`, error);
      throw error;
    }
  }

  async subscribe(
    topic: string,
    callback: (payload: EachMessagePayload) => Promise<void>,
  ): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      await this.consumer.run({
        eachMessage: async (payload) => {
          try {
            await callback(payload);
          } catch (error) {
            this.logger.error(`Error processing message from ${topic}`, error);
          }
        },
      });
    } catch (error) {
      this.logger.error(`Error subscribing to ${topic}`, error);
    }
  }

  async publishEvent(eventType: string, data: any): Promise<void> {
    await this.publish(eventType, {
      id: data.id || `${eventType}-${Date.now()}`,
      eventType,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  async publishNotification(notification: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: any;
  }): Promise<void> {
    await this.publish('notification.send', {
      id: `notification-${Date.now()}`,
      eventType: 'notification.send',
      timestamp: new Date().toISOString(),
      data: notification,
    });
  }
}
