import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityCheck, QualityRule, Annotation, Task, Project } from '@app/common';
import { QualityCheckController } from './quality-check.controller';
import { QualityCheckService } from './quality-check.service';
import { QualityRulesEngine } from './quality-rules.engine';
import { QualityGateService } from '../services/quality-gate.service';
import { GoldTaskModule } from '../gold-task/gold-task.module';
import { StateManagementModule } from '../state-management/state-management.module';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QualityCheck, QualityRule, Annotation, Task, Project]),
    GoldTaskModule,
    KafkaModule,
    forwardRef(() => StateManagementModule),
  ],
  controllers: [QualityCheckController],
  providers: [QualityCheckService, QualityRulesEngine, QualityGateService],
  exports: [QualityCheckService, QualityGateService],
})
export class QualityCheckModule {}
