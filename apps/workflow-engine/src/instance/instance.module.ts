import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstanceService } from './instance.service';
import { InstanceController } from './instance.controller';
import { WorkflowInstance } from '@app/common';
import { WorkflowModule } from '../workflow/workflow.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowInstance]),
    WorkflowModule,
    RedisModule,
  ],
  controllers: [InstanceController],
  providers: [InstanceService],
  exports: [InstanceService],
})
export class InstanceModule {}
