import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, User } from '@app/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, User]),
    AuditModule, // provides AuditService for compliance report generation and anonymization
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService],
})
export class ComplianceModule {}
