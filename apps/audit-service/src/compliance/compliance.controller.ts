import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';

@ApiTags('compliance')
@ApiBearerAuth()
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('report')
  @ApiOperation({ summary: 'Generate compliance report for a date range' })
  @ApiResponse({ status: 200, description: 'Compliance report generated' })
  async getComplianceReport(
    @Query('projectId') projectId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const from = dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = dateTo ?? new Date().toISOString();
    return this.complianceService.generateReport(projectId, from, to);
  }

  @Get('data-retention')
  @ApiOperation({ summary: 'Get data retention status and archival recommendations' })
  @ApiResponse({ status: 200, description: 'Data retention info retrieved' })
  async getDataRetention() {
    return this.complianceService.getDataRetentionStatus();
  }

  @Post('gdpr/right-to-erasure')
  @ApiOperation({ summary: 'Anonymize all audit records for a user (GDPR right to erasure)' })
  @ApiBody({ schema: { properties: { userId: { type: 'string', format: 'uuid' } }, required: ['userId'] } })
  @ApiResponse({ status: 200, description: 'User data anonymized in audit logs' })
  async rightToErasure(@Body('userId') userId: string) {
    return this.complianceService.anonymizeUser(userId);
  }
}
