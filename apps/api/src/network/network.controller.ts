import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { NetworkService } from './network.service';

@ApiTags('network')
@Controller()
export class NetworkController {
  constructor(private readonly service: NetworkService) {}

  @Get('network/dashboard')
  @RequirePermissions('stock:network:read')
  @ApiOperation({ summary: 'Situação por clínica e indicadores consolidados (E-46)' })
  dashboard() {
    return this.service.dashboard();
  }

  @Get('network/balances')
  @RequirePermissions('stock:network:read')
  @ApiOperation({ summary: 'Saldo de um código de insumo em todas as clínicas (E-47)' })
  balances(@Query() query: Record<string, string>) {
    return this.service.balances(query);
  }

  @Get('network/weekly-consumption')
  @RequirePermissions('stock:network:read')
  @ApiOperation({ summary: 'Consumo semanal na rede ou por clínica (E-48)' })
  weeklyConsumption(@Query() query: Record<string, string>) {
    return this.service.weeklyConsumption(query);
  }

  @Get('network/reports/:report')
  @RequirePermissions('stock:network:read')
  @ApiOperation({ summary: 'Relatórios consolidados da rede (E-49)' })
  report(@Param('report') report: string, @Query() query: Record<string, string>) {
    return this.service.report(report, query);
  }
}
