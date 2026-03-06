import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, Assignment, User, ProjectTeamMember } from '@app/common';
import { ProductivityController } from './productivity.controller';
import { ProductivityService } from './productivity.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Assignment, User, ProjectTeamMember])],
  controllers: [ProductivityController],
  providers: [ProductivityService],
  exports: [ProductivityService],
})
export class ProductivityModule {}
