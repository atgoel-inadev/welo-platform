/**
 * Shared Infrastructure Library
 * Provides reusable infrastructure modules for all Welo Platform services
 */

// Kafka (legacy - kept for backward compatibility)
export * from './kafka/kafka.module';
export * from './kafka/kafka.service';
export * from './kafka/kafka.interface';

// Messaging (new abstraction - Kafka or AWS SNS/SQS)
export * from './messaging';

// Other infrastructure
export * from './redis/redis.module';
export * from './redis/redis.service';
export * from './health/health.module';
export * from './health/health.controller';
export * from './health/health.interface';
export * from './tracing';
