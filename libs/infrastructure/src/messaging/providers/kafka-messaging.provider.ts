import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer, Admin } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { context as otelContext, propagation } from '@opentelemetry/api';
import {
  IMessagingService,
  MessagePayload,
  PublishOptions,
  SubscribeOptions,
  MessagingConfig,
} from '../interfaces/messaging.interface';

/**
 * Kafka implementation of messaging provider
 * Used for local/Docker environments
 */
@Injectable()
export class KafkaMessagingProvider implements IMessagingService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaMessagingProvider.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin;
  private _isConnected = false;
  private readonly config: MessagingConfig['kafka'];
  private readonly clientId: string;

  constructor(config: MessagingConfig) {
    if (!config.kafka) {
      throw new Error('Kafka configuration is required for KafkaMessagingProvider');
    }

    this.config = config.kafka;
    this.clientId = this.config.clientId;

    this.kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: this.config.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: this.config.consumerGroupId,
    });
    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');

      await this.consumer.connect();
      this.logger.log('Kafka consumer connected');

      await this.admin.connect();
      this.logger.log('Kafka admin connected');

      if (this.config.topics && this.config.topics.length > 0) {
        await this.createTopics(this.config.topics);
      }

      this._isConnected = true;
      this.logger.log(`Kafka initialized for ${this.clientId}`);
    } catch (error) {
      this.logger.error('Failed to connect to Kafka', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      await this.admin.disconnect();
      this._isConnected = false;
      this.logger.log('Kafka connections closed');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka', error);
    }
  }

  private async createTopics(topics: string[]): Promise<void> {
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

  async publish(topic: string, message: any, options?: PublishOptions): Promise<void> {
    if (!this._isConnected) {
      this.logger.warn('Kafka not connected, skipping message publish');
      return;
    }

    // Inject W3C TraceContext into Kafka message headers for async trace propagation
    const traceHeaders: Record<string, string> = options?.traceContext || {};
    propagation.inject(otelContext.active(), traceHeaders);
    
    const kafkaHeaders = Object.fromEntries(
      Object.entries(traceHeaders).map(([k, v]) => [k, Buffer.from(v)]),
    );

    // Add correlation ID if provided
    if (options?.correlationId) {
      kafkaHeaders['x-correlation-id'] = Buffer.from(options.correlationId);
    }

    // Add custom attributes
    if (options?.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        kafkaHeaders[key] = Buffer.from(value);
      });
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: message.id || message.taskId || Date.now().toString(),
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
            headers: kafkaHeaders,
          },
        ],
      });
      
      this.logger.debug(`Published message to topic: ${topic}`, {
        topic,
        messageId: message.id || message.taskId,
        correlationId: options?.correlationId,
      });
    } catch (error) {
      this.logger.error(`Error publishing to topic ${topic}`, error);
      throw error;
    }
  }

  async subscribe(
    topic: string,
    handler: (payload: MessagePayload) => Promise<void>,
    options?: SubscribeOptions,
  ): Promise<void> {
    try {
      await this.consumer.subscribe({ 
        topic, 
        fromBeginning: options?.fromBeginning ?? false 
      });
      
      await this.consumer.run({
        eachMessage: async (kafkaPayload) => {
          try {
            // Extract trace context from headers
            const headers: Record<string, any> = {};
            if (kafkaPayload.message.headers) {
              Object.entries(kafkaPayload.message.headers).forEach(([key, value]) => {
                headers[key] = value?.toString();
              });
            }

            // Convert Kafka payload to our MessagePayload format
            const messagePayload: MessagePayload = {
              topic: kafkaPayload.topic,
              key: kafkaPayload.message.key?.toString(),
              value: JSON.parse(kafkaPayload.message.value.toString()),
              headers,
              metadata: {
                messageId: uuidv4(),
                timestamp: new Date(parseInt(kafkaPayload.message.timestamp)).toISOString(),
                correlationId: headers['x-correlation-id'],
                traceId: headers['traceparent'],
              },
            };

            await handler(messagePayload);
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

  async subscribeToTopics(
    topics: string[],
    handler: (payload: MessagePayload) => Promise<void>,
    options?: SubscribeOptions,
  ): Promise<void> {
    try {
      for (const topic of topics) {
        await this.consumer.subscribe({ 
          topic, 
          fromBeginning: options?.fromBeginning ?? false 
        });
      }

      await this.consumer.run({
        eachMessage: async (kafkaPayload) => {
          try {
            // Extract trace context from headers
            const headers: Record<string, any> = {};
            if (kafkaPayload.message.headers) {
              Object.entries(kafkaPayload.message.headers).forEach(([key, value]) => {
                headers[key] = value?.toString();
              });
            }

            const messagePayload: MessagePayload = {
              topic: kafkaPayload.topic,
              key: kafkaPayload.message.key?.toString(),
              value: JSON.parse(kafkaPayload.message.value.toString()),
              headers,
              metadata: {
                messageId: uuidv4(),
                timestamp: new Date(parseInt(kafkaPayload.message.timestamp)).toISOString(),
                correlationId: headers['x-correlation-id'],
                traceId: headers['traceparent'],
              },
            };

            await handler(messagePayload);
          } catch (error) {
            this.logger.error(`Error handling message from topic ${kafkaPayload.topic}`, error);
          }
        },
      });

      this.logger.log(`Subscribed to topics: ${topics.join(', ')}`);
    } catch (error) {
      this.logger.error('Error subscribing to topics', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  getProviderType(): string {
    return 'kafka';
  }

  // ── Domain Event Helper Methods ────────────────────────────────────────────

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

  async publishEvent(
    topic: string,
    payload: any,
    source?: string,
    correlationId?: string,
  ): Promise<void> {
    await this.publish(
      topic,
      {
        eventId: uuidv4(),
        eventType: topic,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: source ?? this.clientId,
        ...(correlationId && { correlationId }),
        payload,
      },
      { correlationId },
    );
  }
}
