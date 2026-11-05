import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@Controller()
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get('clinics/:clinicId/alerts')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Condições de alerta vigentes do perfil (E-41)' })
  list(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.list(clinicId, query);
  }
}
