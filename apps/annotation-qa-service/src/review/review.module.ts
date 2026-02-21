import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewApproval, Annotation, QualityCheck, Task } from '@app/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { StateManagementModule } from '../state-management/state-management.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewApproval, Annotation, QualityCheck, Task]),
    StateManagementModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
