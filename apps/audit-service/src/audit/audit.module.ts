import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, User } from '@app/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditEventHandler } from './events/audit-event.handler';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User])],
  controllers: [AuditController],
  providers: [AuditService, AuditEventHandler],
  exports: [AuditService],
})
export class AuditModule {}
