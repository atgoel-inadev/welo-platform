/**
 * Messaging infrastructure exports
 * Provides environment-aware messaging abstraction (Kafka or AWS SNS/SQS)
 */

export * from './interfaces/messaging.interface';
export * from './providers/kafka-messaging.provider';
export * from './providers/aws-messaging.provider';
export * from './messaging.module';
export { MESSAGING_SERVICE } from './messaging.module';
