import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { Kafka, Producer, Consumer, Admin, EachMessagePayload } from 'kafkajs';
import { KafkaModuleOptions } from './kafka.interface';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin;
  private isConnected = false;

  constructor(@Inject('KAFKA_OPTIONS') private options: KafkaModuleOptions) {
    const brokers = options.brokers || (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    
    this.kafka = new Kafka({
      clientId: options.clientId,
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: options.consumerGroupId,
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

      if (this.options.topics && this.options.topics.length > 0) {
        await this.createTopics(this.options.topics);
      }

      this.isConnected = true;
      this.logger.log(`Kafka initialized for ${this.options.clientId}`);
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

  private async createTopics(topics: string[]) {
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
            key: message.id || message.taskId || Date.now().toString(),
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      });
      this.logger.debug(`Published message to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Error publishing to topic ${topic}`, error);
      throw error;
    }
  }

  async subscribe(
    topic: string,
    handler: (payload: EachMessagePayload) => Promise<void>,
  ): Promise<void> {
    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      await this.consumer.run({
        eachMessage: async (payload) => {
          try {
            await handler(payload);
          } catch (error) {
            this.logger.error(`Error handling message from topic ${topic}`, error);
          }
        },
      });
      this.logger.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Error subscribing to topic ${topic}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to multiple topics with a single handler
   */
  async subscribeToTopics(
    topics: string[],
    handler: (payload: EachMessagePayload) => Promise<void>,
  ): Promise<void> {
    try {
      for (const topic of topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }

      await this.consumer.run({
        eachMessage: async (payload) => {
          try {
            await handler(payload);
          } catch (error) {
            this.logger.error(`Error handling message from topic ${payload.topic}`, error);
          }
        },
      });

      this.logger.log(`Subscribed to topics: ${topics.join(', ')}`);
    } catch (error) {
      this.logger.error('Error subscribing to topics', error);
      throw error;
    }
  }

  getProducer(): Producer {
    return this.producer;
  }

  getConsumer(): Consumer {
    return this.consumer;
  }

  getAdmin(): Admin {
    return this.admin;
  }

  isKafkaConnected(): boolean {
    return this.isConnected;
  }

  // ── Helper Methods for Domain Events ────────────────────────────────────────

  async publishTaskEvent(event: string, task: any): Promise<void> {
    await this.publish(`task.${event}`, {
      ...task,
      timestamp: new Date().toISOString(),
    });
  }

  async publishBatchEvent(event: string, batch: any): Promise<void> {
    await this.publish(`batch.${event}`, {
      ...batch,
      timestamp: new Date().toISOString(),
    });
  }

  async publishAssignmentEvent(event: string, assignment: any): Promise<void> {
    await this.publish(`assignment.${event}`, {
      ...assignment,
      timestamp: new Date().toISOString(),
    });
  }

  async publishAnnotationEvent(annotation: any): Promise<void> {
    await this.publish('annotation.submitted', {
      ...annotation,
      timestamp: new Date().toISOString(),
    });
  }

  async publishQualityCheckRequest(task: any): Promise<void> {
    await this.publish('quality_check.requested', {
      taskId: task.id,
      projectId: task.projectId,
      timestamp: new Date().toISOString(),
    });
  }

  async publishNotification(notification: any): Promise<void> {
    await this.publish('notification.send', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  async publishEvent(topic: string, payload: any): Promise<void> {
    await this.publish(topic, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }
}
