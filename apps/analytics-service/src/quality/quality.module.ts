import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityCheck, Assignment, Task } from '@app/common';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';

@Module({
  imports: [TypeOrmModule.forFeature([QualityCheck, Assignment, Task])],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
