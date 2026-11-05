import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { BudgetService } from './budget.service';

@ApiTags('budget')
@Controller()
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Get('clinics/:clinicId/budget/summary')
  @RequirePermissions('stock:budget:read')
  @ApiOperation({ summary: 'Visão orçamentária: valor em estoque, perdas e consumo em R$ (RF-44) (RF-44)' })
  summary(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.summary(clinicId, query);
  }

  @Get('clinics/:clinicId/budget/valuation')
  @RequirePermissions('stock:budget:read')
  @ApiOperation({ summary: 'Valoração por insumo e por categoria (RF-44, RN-14) (RF-44)' })
  valuation(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.valuation(clinicId, query);
  }

  @Put('clinics/:clinicId/items/:itemId/cost')
  @RequirePermissions('stock:budget:cost:write')
  @ApiOperation({ summary: 'Custo unitário de referência do insumo (RF-43) (RF-43)' })
  updateCost(@Param('clinicId') clinicId: string, @Param('itemId') itemId: string, @Body() body: Record<string, unknown>) {
    return this.service.updateCost(clinicId, itemId, body);
  }

  @Put('me/budget-view')
  @RequirePermissions('stock:budget:switch')
  @ApiOperation({ summary: 'Chave de visão orçamentária do Superuser (RF-45) (RF-45)' })
  toggleView(@Body() body: Record<string, unknown>) {
    return this.service.toggleView(body);
  }
}
