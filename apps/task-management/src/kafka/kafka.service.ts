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
      clientId: 'task-management-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: 'task-management-group',
    });
    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');

      await this.consumer.connect();
      this.logger.log('Kafka consumer connected');

      await this.admin.connect();
      this.logger.log('Kafka admin connected');

      await this.createTopics();
      this.isConnected = true;
    } catch (error) {
      this.logger.error('Failed to connect to Kafka', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      await this.admin.disconnect();
      this.logger.log('Kafka connections closed');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka', error);
    }
  }

  private async createTopics() {
    const topics = [
      'task.created',
      'task.updated',
      'task.assigned',
      'task.completed',
      'task.submitted',
      'task.state_changed',
      'annotation.submitted',
      'quality_check.requested',
      'notification.send',
    ];

    try {
      const existingTopics = await this.admin.listTopics();
      const topicsToCreate = topics.filter((topic) => !existingTopics.includes(topic));

      if (topicsToCreate.length > 0) {
        await this.admin.createTopics({
          topics: topicsToCreate.map((topic) => ({
            topic,
            numPartitions: 3,
            replicationFactor: 1,
          })),
        });
        this.logger.log(`Created topics: ${topicsToCreate.join(', ')}`);
      }
    } catch (error) {
      this.logger.error('Error creating topics', error);
    }
  }

  async publish(topic: string, message: any): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Kafka not connected, skipping message publish');
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
      this.logger.debug(`Published message to ${topic}`, message);
    } catch (error) {
      this.logger.error(`Error publishing to ${topic}`, error);
      throw error;
    }
  }

  async subscribe(topic: string, callback: (payload: EachMessagePayload) => Promise<void>): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Kafka not connected, skipping subscription');
      return;
    }

    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      await this.consumer.run({
        eachMessage: async (payload) => {
          try {
            this.logger.debug(`Received message from ${topic}`, payload.message.value.toString());
            await callback(payload);
          } catch (error) {
            this.logger.error(`Error processing message from ${topic}`, error);
          }
        },
      });
      this.logger.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Error subscribing to ${topic}`, error);
    }
  }

  async publishTaskEvent(eventType: 'created' | 'updated' | 'assigned' | 'completed' | 'submitted' | 'state_changed', task: any): Promise<void> {
    await this.publish(`task.${eventType}`, {
      id: task.id,
      eventType: `task.${eventType}`,
      timestamp: new Date().toISOString(),
      data: task,
    });
  }

  async publishAnnotationEvent(annotation: any): Promise<void> {
    await this.publish('annotation.submitted', {
      id: annotation.id,
      eventType: 'annotation.submitted',
      timestamp: new Date().toISOString(),
      data: annotation,
    });
  }

  async publishQualityCheckRequest(task: any): Promise<void> {
    await this.publish('quality_check.requested', {
      id: task.id,
      eventType: 'quality_check.requested',
      timestamp: new Date().toISOString(),
      data: task,
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
