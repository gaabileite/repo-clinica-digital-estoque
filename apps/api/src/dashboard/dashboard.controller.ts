import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller()
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('clinics/:clinicId/dashboard')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Painel por perfil (E-16)' })
  summary(@Param('clinicId') clinicId: string) {
    return this.service.summary(clinicId);
  }

  @Get('clinics/:clinicId/dashboard/weekly-consumption')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Consumo semanal de um insumo (E-17)' })
  weeklyConsumption(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.weeklyConsumption(clinicId, query);
  }
}
