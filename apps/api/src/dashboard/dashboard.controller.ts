import { Controller, Get, Param, ParseUUIDPipe, Query, UnauthorizedException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import type { AuthContext } from '../access/auth-context';
import { DashboardService } from './dashboard.service';
import { DashboardDto, WeeklyConsumptionDto } from './dto/dashboard-responses.dto';
import { WeeklyConsumptionQueryDto } from './dto/weekly-consumption-query.dto';

@ApiTags('dashboard')
@Controller()
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('clinics/:clinicId/dashboard')
  @RequirePermissions('stock:read')
  @ApiOperation({
    summary: 'Painel por perfil (E-16)',
    description:
      'Indicadores em itens, itens críticos, lotes a vencer e vencidos. As últimas movimentações só vêm para Administrador e Superuser.',
  })
  @ApiOkResponse({ type: DashboardDto })
  summary(@Param('clinicId', ParseUUIDPipe) clinicId: string, @CurrentAuth() auth: AuthContext | undefined) {
    // The AuthGuard always fills this in on protected routes; this only satisfies the type.
    if (!auth) throw new UnauthorizedException({ code: 'UNAUTHORIZED', detail: 'Autenticação necessária.' });
    return this.service.summary(clinicId, auth);
  }

  @Get('clinics/:clinicId/dashboard/weekly-consumption')
  @RequirePermissions('stock:reports')
  @ApiOperation({
    summary: 'Consumo semanal de um insumo (E-17)',
    description: 'Só Superuser e Administrador. A última semana é a atual, ainda em andamento.',
  })
  @ApiOkResponse({ type: WeeklyConsumptionDto })
  weeklyConsumption(@Param('clinicId', ParseUUIDPipe) clinicId: string, @Query() query: WeeklyConsumptionQueryDto) {
    return this.service.weeklyConsumption(clinicId, query);
  }
}