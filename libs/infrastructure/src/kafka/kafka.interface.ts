export interface KafkaModuleOptions {
  clientId: string;
  consumerGroupId: string;
  brokers?: string[];
  topics?: string[];
}
