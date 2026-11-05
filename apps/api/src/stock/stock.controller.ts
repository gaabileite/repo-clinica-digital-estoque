import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { StockService } from './stock.service';

@ApiTags('stock')
@Controller()
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get('clinics/:clinicId/balances')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Saldo por insumo, nível crítico, cobertura e validade mais próxima (E-12)' })
  balances(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.balances(clinicId, query);
  }

  @Get('clinics/:clinicId/items/:itemId/lots')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Lotes com saldo em ordem de validade (FEFO) (E-13)' })
  lots(@Param('clinicId') clinicId: string, @Param('itemId') itemId: string) {
    return this.service.lots(clinicId, itemId);
  }

  @Get('clinics/:clinicId/items/:itemId/availability')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Disponibilidade para consumo e lote sugerido (E-14)' })
  availability(@Param('clinicId') clinicId: string, @Param('itemId') itemId: string, @Query() query: Record<string, string>) {
    return this.service.availability(clinicId, itemId, query);
  }

  @Get('clinics/:clinicId/items/:itemId/consumption-profile')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Consumo médio de 30 dias e média aprendida (E-15)' })
  consumptionProfile(@Param('clinicId') clinicId: string, @Param('itemId') itemId: string) {
    return this.service.consumptionProfile(clinicId, itemId);
  }

  @Get('clinics/:clinicId/items/:itemId/lead-time')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Tempo de reposição medido ou estimado (E-33)' })
  leadTime(@Param('clinicId') clinicId: string, @Param('itemId') itemId: string) {
    return this.service.leadTime(clinicId, itemId);
  }
}
