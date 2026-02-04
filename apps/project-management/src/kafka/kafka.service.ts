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
      clientId: 'project-management-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: 'project-management-group',
    });
    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    try {
      // Connect producer
      await this.producer.connect();
      this.logger.log('Kafka producer connected');

      // Connect consumer
      await this.consumer.connect();
      this.logger.log('Kafka consumer connected');

      // Connect admin
      await this.admin.connect();
      this.logger.log('Kafka admin connected');

      // Create topics if they don't exist
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
      'batch.created',
      'batch.updated',
      'batch.completed',
      'task.created',
      'task.assigned',
      'task.updated',
      'task.completed',
      'assignment.created',
      'assignment.expired',
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

  async publishBatchEvent(eventType: 'created' | 'updated' | 'completed', batch: any): Promise<void> {
    await this.publish(`batch.${eventType}`, {
      id: batch.id,
      eventType: `batch.${eventType}`,
      timestamp: new Date().toISOString(),
      data: batch,
    });
  }

  async publishTaskEvent(eventType: 'created' | 'assigned' | 'updated' | 'completed', task: any): Promise<void> {
    await this.publish(`task.${eventType}`, {
      id: task.id,
      eventType: `task.${eventType}`,
      timestamp: new Date().toISOString(),
      data: task,
    });
  }

  async publishAssignmentEvent(eventType: 'created' | 'expired', assignment: any): Promise<void> {
    await this.publish(`assignment.${eventType}`, {
      id: assignment.id,
      eventType: `assignment.${eventType}`,
      timestamp: new Date().toISOString(),
      data: assignment,
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
