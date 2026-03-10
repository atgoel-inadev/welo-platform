import { v4 as uuidv4 } from 'uuid';

export interface KafkaEventEnvelope<T = Record<string, any>> {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  source: string;
  correlationId?: string;
  payload: T;
}

export function createKafkaEvent<T>(
  eventType: string,
  source: string,
  payload: T,
  correlationId?: string,
): KafkaEventEnvelope<T> {
  return {
    eventId: uuidv4(),
    eventType,
    timestamp: new Date().toISOString(),
    version: '1.0',
    source,
    correlationId,
    payload,
  };
}
