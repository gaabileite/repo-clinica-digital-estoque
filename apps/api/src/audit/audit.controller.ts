import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller()
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('clinics/:clinicId/audit-trail')
  @RequirePermissions('stock:audit')
  @ApiOperation({ summary: 'Trilha de auditoria do módulo (E-40)' })
  trail(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.trail(clinicId, query);
  }
}
