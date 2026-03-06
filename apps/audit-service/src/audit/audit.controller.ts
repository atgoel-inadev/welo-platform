import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query audit logs with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async queryAuditLogs(@Query() filter: AuditQueryDto) {
    return this.auditService.queryAuditLogs(filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics: action breakdown, entity breakdown, daily series' })
  @ApiResponse({ status: 200, description: 'Audit statistics retrieved' })
  async getStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.getStats(dateFrom, dateTo);
  }

  @Get('entity/:type/:id')
  @ApiOperation({ summary: 'Get full audit trail for a specific entity' })
  @ApiParam({ name: 'type', description: 'Entity type e.g. TASK, BATCH, ANNOTATION' })
  @ApiParam({ name: 'id', description: 'Entity UUID' })
  @ApiResponse({ status: 200, description: 'Entity audit trail retrieved' })
  async getEntityAuditTrail(
    @Param('type') entityType: string,
    @Param('id') entityId: string,
  ) {
    return this.auditService.getEntityAuditTrail(entityType, entityId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all audit actions by a specific user' })
  @ApiResponse({ status: 200, description: 'User audit trail retrieved' })
  async getUserAuditTrail(
    @Param('userId') userId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.getUserAuditTrail(userId, dateFrom, dateTo);
  }
}
