import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { ListBalancesQueryDto } from './dto/list-balances-query.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { AvailabilityDto, BalancePageDto, ConsumptionProfileDto, LotListDto } from './dto/stock-responses.dto';
import { StockService } from './stock.service';

@ApiTags('stock')
@Controller()
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get('clinics/:clinicId/balances')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Saldo por insumo, nível crítico, cobertura e validade mais próxima (E-12)' })
  @ApiOkResponse({ type: BalancePageDto })
  balances(@Param('clinicId', new ParseUUIDPipe()) clinicId: string, @Query() query: ListBalancesQueryDto) {
    return this.service.balances(clinicId, query);
  }

  @Get('clinics/:clinicId/items/:itemId/lots')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Lotes com saldo em ordem de validade (FEFO) (E-13)' })
  @ApiOkResponse({ type: LotListDto })
  lots(@Param('clinicId', new ParseUUIDPipe()) clinicId: string, @Param('itemId', new ParseUUIDPipe()) itemId: string) {
    return this.service.lots(clinicId, itemId);
  }

  @Get('clinics/:clinicId/items/:itemId/availability')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Disponibilidade para consumo e lote sugerido (E-14)' })
  @ApiOkResponse({ type: AvailabilityDto })
  availability(
    @Param('clinicId', new ParseUUIDPipe()) clinicId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.service.availability(clinicId, itemId, query.quantity, query.lotId);
  }

  @Get('clinics/:clinicId/items/:itemId/consumption-profile')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Consumo médio de 30 dias e média aprendida (E-15)' })
  @ApiOkResponse({ type: ConsumptionProfileDto })
  consumptionProfile(@Param('clinicId', new ParseUUIDPipe()) clinicId: string, @Param('itemId', new ParseUUIDPipe()) itemId: string) {
    return this.service.consumptionProfile(clinicId, itemId);
  }

  @Get('clinics/:clinicId/items/:itemId/lead-time')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Tempo de reposição medido ou estimado (E-33)' })
  leadTime(@Param('clinicId') clinicId: string, @Param('itemId') itemId: string) {
    return this.service.leadTime(clinicId, itemId);
  }
}
