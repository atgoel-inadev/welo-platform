import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransitionService } from './transition.service';
import { TransitionController } from './transition.controller';
import { StateTransition } from '@app/common';

@Module({
  imports: [TypeOrmModule.forFeature([StateTransition])],
  controllers: [TransitionController],
  providers: [TransitionService],
  exports: [TransitionService],
})
export class TransitionModule {}
