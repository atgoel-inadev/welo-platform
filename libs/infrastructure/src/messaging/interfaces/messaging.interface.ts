/**
 * Messaging abstraction for event-driven architecture
 * Supports Kafka (local/Docker) and AWS SNS/SQS (production)
 */

export interface MessageMetadata {
  messageId: string;
  timestamp: string;
  correlationId?: string;
  traceId?: string;
  source?: string;
  version?: string;
}

export interface PublishOptions {
  correlationId?: string;
  traceContext?: Record<string, string>;
  attributes?: Record<string, string>;
  dedupId?: string; // For AWS FIFO queues
}

export interface SubscribeOptions {
  fromBeginning?: boolean;
  batchSize?: number;
  visibilityTimeout?: number; // AWS SQS specific
  waitTimeSeconds?: number; // AWS SQS long polling
}

export interface MessagePayload {
  topic: string;
  key?: string;
  value: any;
  headers?: Record<string, any>;
  metadata?: MessageMetadata;
}

/**
 * Core messaging provider interface
 * Implementations: KafkaMessagingProvider, AwsMessagingProvider
 */
export interface IMessagingProvider {
  /**
   * Connect to messaging infrastructure
   */
  connect(): Promise<void>;

  /**
   * Disconnect from messaging infrastructure
   */
  disconnect(): Promise<void>;

  /**
   * Publish message to a topic/channel
   */
  publish(topic: string, message: any, options?: PublishOptions): Promise<void>;

  /**
   * Subscribe to messages from topic/channel
   */
  subscribe(
    topic: string,
    handler: (payload: MessagePayload) => Promise<void>,
    options?: SubscribeOptions,
  ): Promise<void>;

  /**
   * Subscribe to multiple topics
   */
  subscribeToTopics(
    topics: string[],
    handler: (payload: MessagePayload) => Promise<void>,
    options?: SubscribeOptions,
  ): Promise<void>;

  /**
   * Check if provider is connected
   */
  isConnected(): boolean;

  /**
   * Get provider type (for logging/debugging)
   */
  getProviderType(): string;
}

/**
 * Domain event helper methods
 * These are convenience methods for common event patterns
 */
export interface IDomainEventPublisher {
  publishTaskEvent(event: string, task: any): Promise<void>;
  publishBatchEvent(event: string, batch: any): Promise<void>;
  publishAssignmentEvent(event: string, assignment: any): Promise<void>;
  publishAnnotationEvent(annotation: any): Promise<void>;
  publishQualityCheckRequest(task: any): Promise<void>;
  publishNotification(notification: any): Promise<void>;
  publishEvent(topic: string, payload: any, source?: string, correlationId?: string): Promise<void>;
}

/**
 * Combined messaging service interface
 */
export interface IMessagingService extends IMessagingProvider, IDomainEventPublisher {}

/**
 * Configuration for messaging providers
 */
export interface MessagingConfig {
  provider: 'kafka' | 'aws';
  kafka?: {
    clientId: string;
    consumerGroupId: string;
    brokers: string[];
    topics?: string[];
  };
  aws?: {
    region: string;
    accountId: string;
    topicPrefix?: string;
    queuePrefix?: string;
    enableFifo?: boolean;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
}
