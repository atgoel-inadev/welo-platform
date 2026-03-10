import { Module } from '@nestjs/common';
import { AnalyticsEventHandler } from './analytics-event.handler';

@Module({
  providers: [AnalyticsEventHandler],
})
export class AnalyticsEventsModule {}
