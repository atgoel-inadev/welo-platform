import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SNSClient, PublishCommand, CreateTopicCommand } from '@aws-sdk/client-sns';
import { 
  SQSClient, 
  ReceiveMessageCommand, 
  DeleteMessageCommand,
  CreateQueueCommand,
  GetQueueUrlCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
import { context as otelContext, propagation, trace } from '@opentelemetry/api';
import {
  IMessagingService,
  MessagePayload,
  PublishOptions,
  SubscribeOptions,
  MessagingConfig,
} from '../interfaces/messaging.interface';

/**
 * AWS SNS/SQS implementation of messaging provider
 * Used for production AWS deployments
 * 
 * - SNS for publishing (pub/sub)
 * - SQS for consuming (queue-based)
 * - Full OpenTelemetry traceability
 * - Event audit logging
 */
@Injectable()
export class AwsMessagingProvider implements IMessagingService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AwsMessagingProvider.name);
  private snsClient: SNSClient;
  private sqsClient: SQSClient;
  private _isConnected = false;
  private readonly config: MessagingConfig['aws'];
  private readonly topicArns: Map<string, string> = new Map();
  private readonly queueUrls: Map<string, string> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: MessagingConfig) {
    if (!config.aws) {
      throw new Error('AWS configuration is required for AwsMessagingProvider');
    }

    this.config = config.aws;

    const awsConfig = {
      region: this.config.region,
      ...(this.config.credentials && { credentials: this.config.credentials }),
    };

    this.snsClient = new SNSClient(awsConfig);
    this.sqsClient = new SQSClient(awsConfig);
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      // Test connectivity by listing/creating a health check topic
      const healthTopic = await this.getOrCreateTopic('health-check');
      this.logger.log(`AWS SNS/SQS connected - Region: ${this.config.region}`);
      this.logger.log(`Health check topic: ${healthTopic}`);
      
      this._isConnected = true;
    } catch (error) {
      this.logger.error('Failed to connect to AWS SNS/SQS', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Stop all polling intervals
      this.pollingIntervals.forEach((interval) => clearInterval(interval));
      this.pollingIntervals.clear();
      
      this._isConnected = false;
      this.logger.log('AWS SNS/SQS connections closed');
    } catch (error) {
      this.logger.error('Error disconnecting from AWS SNS/SQS', error);
    }
  }

  /**
   * Get or create SNS topic
   */
  private async getOrCreateTopic(topicName: string): Promise<string> {
    const fullTopicName = this.config.topicPrefix 
      ? `${this.config.topicPrefix}-${topicName}`
      : topicName;

    // Check cache first
    if (this.topicArns.has(fullTopicName)) {
      return this.topicArns.get(fullTopicName)!;
    }

    try {
      const command = new CreateTopicCommand({
        Name: fullTopicName,
        ...(this.config.enableFifo && {
          Attributes: {
            FifoTopic: 'true',
            ContentBasedDeduplication: 'true',
          },
        }),
      });

      const response = await this.snsClient.send(command);
      const topicArn = response.TopicArn!;
      
      this.topicArns.set(fullTopicName, topicArn);
      this.logger.log(`SNS Topic ready: ${fullTopicName} (${topicArn})`);
      
      return topicArn;
    } catch (error) {
      this.logger.error(`Error creating/getting SNS topic ${fullTopicName}`, error);
      throw error;
    }
  }

  /**
   * Get or create SQS queue
   */
  private async getOrCreateQueue(queueName: string): Promise<string> {
    const fullQueueName = this.config.queuePrefix 
      ? `${this.config.queuePrefix}-${queueName}`
      : queueName;

    // Check cache first
    if (this.queueUrls.has(fullQueueName)) {
      return this.queueUrls.get(fullQueueName)!;
    }

    try {
      // Try to get existing queue
      try {
        const getUrlCommand = new GetQueueUrlCommand({ QueueName: fullQueueName });
        const urlResponse = await this.sqsClient.send(getUrlCommand);
        const queueUrl = urlResponse.QueueUrl!;
        this.queueUrls.set(fullQueueName, queueUrl);
        return queueUrl;
      } catch (error) {
        // Queue doesn't exist, create it
        const createCommand = new CreateQueueCommand({
          QueueName: fullQueueName,
          Attributes: {
            VisibilityTimeout: '30',
            MessageRetentionPeriod: '345600', // 4 days
            ReceiveMessageWaitTimeSeconds: '20', // Long polling
            ...(this.config.enableFifo && {
              FifoQueue: 'true',
              ContentBasedDeduplication: 'true',
            }),
          },
        });

        const createResponse = await this.sqsClient.send(createCommand);
        const queueUrl = createResponse.QueueUrl!;
        
        this.queueUrls.set(fullQueueName, queueUrl);
        this.logger.log(`SQS Queue created: ${fullQueueName} (${queueUrl})`);
        
        return queueUrl;
      }
    } catch (error) {
      this.logger.error(`Error creating/getting SQS queue ${fullQueueName}`, error);
      throw error;
    }
  }

  /**
   * Subscribe SQS queue to SNS topic
   */
  private async subscribeQueueToTopic(queueUrl: string, topicArn: string): Promise<void> {
    try {
      // Get queue ARN
      const getAttributesCommand = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['QueueArn', 'Policy'],
      });
      
      const attributes = await this.sqsClient.send(getAttributesCommand);
      const queueArn = attributes.Attributes?.QueueArn;

      if (!queueArn) {
        throw new Error('Could not retrieve queue ARN');
      }

      // Set queue policy to allow SNS to send messages
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'sns.amazonaws.com' },
            Action: 'sqs:SendMessage',
            Resource: queueArn,
            Condition: {
              ArnEquals: {
                'aws:SourceArn': topicArn,
              },
            },
          },
        ],
      };

      const setPolicyCommand = new SetQueueAttributesCommand({
        QueueUrl: queueUrl,
        Attributes: {
          Policy: JSON.stringify(policy),
        },
      });

      await this.sqsClient.send(setPolicyCommand);

      // Subscribe queue to topic (done via AWS SDK v3 SNS)
      const { SubscribeCommand } = await import('@aws-sdk/client-sns');
      const subscribeCommand = new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: 'sqs',
        Endpoint: queueArn,
      });

      await this.snsClient.send(subscribeCommand);
      this.logger.log(`SQS queue subscribed to SNS topic: ${topicArn}`);
    } catch (error) {
      this.logger.error('Error subscribing queue to topic', error);
      throw error;
    }
  }

  async publish(topic: string, message: any, options?: PublishOptions): Promise<void> {
    if (!this._isConnected) {
      this.logger.warn('AWS SNS not connected, skipping message publish');
      return;
    }

    try {
      // Get or create topic
      const topicArn = await this.getOrCreateTopic(topic);

      // Inject trace context
      const traceHeaders: Record<string, string> = options?.traceContext || {};
      propagation.inject(otelContext.active(), traceHeaders);

      // Build message attributes for tracing
      const messageAttributes: Record<string, any> = {
        timestamp: {
          DataType: 'String',
          StringValue: new Date().toISOString(),
        },
      };

      if (options?.correlationId) {
        messageAttributes['correlationId'] = {
          DataType: 'String',
          StringValue: options.correlationId,
        };
      }

      // Add trace context as attributes
      Object.entries(traceHeaders).forEach(([key, value]) => {
        messageAttributes[key] = {
          DataType: 'String',
          StringValue: value,
        };
      });

      // Add custom attributes
      if (options?.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          messageAttributes[key] = {
            DataType: 'String',
            StringValue: value,
          };
        });
      }

      // Create enriched message with metadata
      const enrichedMessage = {
        messageId: uuidv4(),
        timestamp: new Date().toISOString(),
        topic,
        payload: message,
        ...(options?.correlationId && { correlationId: options.correlationId }),
        traceContext: traceHeaders,
      };

      // Publish to SNS
      const command = new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(enrichedMessage),
        MessageAttributes: messageAttributes,
        ...(this.config.enableFifo && options?.dedupId && {
          MessageDeduplicationId: options.dedupId,
          MessageGroupId: topic,
        }),
      });

      const response = await this.snsClient.send(command);

      // Audit log
      this.logger.log('AWS SNS message published', {
        topic,
        topicArn,
        messageId: response.MessageId,
        correlationId: options?.correlationId,
        traceId: traceHeaders['traceparent'],
      });

      // Trace event
      const span = trace.getTracer('messaging').startSpan('aws.sns.publish');
      span.setAttributes({
        'messaging.system': 'aws_sns',
        'messaging.destination': topic,
        'messaging.destination_kind': 'topic',
        'messaging.message_id': response.MessageId,
      });
      span.end();
    } catch (error) {
      this.logger.error(`Error publishing to SNS topic ${topic}`, error);
      throw error;
    }
  }

  async subscribe(
    topic: string,
    handler: (payload: MessagePayload) => Promise<void>,
    options?: SubscribeOptions,
  ): Promise<void> {
    try {
      // Create queue for this subscription
      const queueName = `${topic}-queue`;
      const queueUrl = await this.getOrCreateQueue(queueName);

      // Get or create SNS topic
      const topicArn = await this.getOrCreateTopic(topic);

      // Subscribe queue to topic
      await this.subscribeQueueToTopic(queueUrl, topicArn);

      // Start polling
      this.startPolling(queueUrl, topic, handler, options);

      this.logger.log(`Subscribed to AWS SNS/SQS: ${topic}`);
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
    for (const topic of topics) {
      await this.subscribe(topic, handler, options);
    }
  }

  /**
   * Start polling SQS queue
   */
  private startPolling(
    queueUrl: string,
    topic: string,
    handler: (payload: MessagePayload) => Promise<void>,
    options?: SubscribeOptions,
  ): void {
    const poll = async () => {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: options?.batchSize || 10,
          WaitTimeSeconds: options?.waitTimeSeconds || 20,
          VisibilityTimeout: options?.visibilityTimeout || 30,
          MessageAttributeNames: ['All'],
        });

        const response = await this.sqsClient.send(command);

        if (response.Messages && response.Messages.length > 0) {
          for (const sqsMessage of response.Messages) {
            try {
              // Parse SNS message wrapper
              const snsWrapper = JSON.parse(sqsMessage.Body!);
              const message = JSON.parse(snsWrapper.Message);

              // Extract trace context
              const traceContext = message.traceContext || {};
              
              // Extract headers from message attributes
              const headers: Record<string, any> = {};
              if (sqsMessage.MessageAttributes) {
                Object.entries(sqsMessage.MessageAttributes).forEach(([key, value]) => {
                  headers[key] = value.StringValue || '';
                });
              }

              // Create message payload
              const messagePayload: MessagePayload = {
                topic,
                value: message.payload,
                headers,
                metadata: {
                  messageId: message.messageId || sqsMessage.MessageId!,
                  timestamp: message.timestamp,
                  correlationId: message.correlationId || headers['correlationId'],
                  traceId: traceContext['traceparent'],
                  source: 'aws-sqs',
                },
              };

              // Create span for message processing
              const span = trace.getTracer('messaging').startSpan('aws.sqs.process', {
                attributes: {
                  'messaging.system': 'aws_sqs',
                  'messaging.destination': topic,
                  'messaging.message_id': messagePayload.metadata.messageId,
                  'messaging.correlation_id': messagePayload.metadata.correlationId,
                },
              });

              try {
                // Process message with handler
                await handler(messagePayload);

                // Delete message after successful processing
                await this.sqsClient.send(
                  new DeleteMessageCommand({
                    QueueUrl: queueUrl,
                    ReceiptHandle: sqsMessage.ReceiptHandle!,
                  }),
                );

                span.setStatus({ code: 1 }); // OK
                
                this.logger.debug('AWS SQS message processed and deleted', {
                  topic,
                  messageId: messagePayload.metadata.messageId,
                  correlationId: messagePayload.metadata.correlationId,
                });
              } catch (handlerError) {
                span.recordException(handlerError as Error);
                span.setStatus({ code: 2 }); // ERROR
                this.logger.error('Error processing SQS message', handlerError);
                // Message will be redelivered after visibility timeout
              } finally {
                span.end();
              }
            } catch (parseError) {
              this.logger.error('Error parsing SQS message', parseError);
              // Delete malformed message
              await this.sqsClient.send(
                new DeleteMessageCommand({
                  QueueUrl: queueUrl,
                  ReceiptHandle: sqsMessage.ReceiptHandle!,
                }),
              );
            }
          }
        }
      } catch (error) {
        this.logger.error('Error polling SQS queue', error);
      }
    };

    // Start polling interval
    const interval = setInterval(poll, 1000); // Poll every second (long polling will wait)
    this.pollingIntervals.set(topic, interval);

    // Initial poll
    poll();
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  getProviderType(): string {
    return 'aws-sns-sqs';
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
        source: source ?? 'aws-messaging-provider',
        ...(correlationId && { correlationId }),
        payload,
      },
      { correlationId },
    );
  }
}
