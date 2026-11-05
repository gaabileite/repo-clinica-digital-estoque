import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemsService } from './items.service';

@ApiTags('items')
@Controller()
export class ItemsController {
  constructor(private readonly service: ItemsService) {}

  @Get('clinics/:clinicId/items')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Lista insumos (busca por código, categoria, situação) (E-01)' })
  list(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.list(clinicId, query);
  }

  @Post('clinics/:clinicId/items')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({ summary: 'Cria insumo; o código INS-0001 é gerado pelo sistema (E-02)' })
  create(@Param('clinicId') clinicId: string, @Body() body: CreateItemDto) {
    return this.service.create(clinicId, body);
  }

  @Get('clinics/:clinicId/items/:itemId')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Detalhe do insumo (E-03)' })
  detail(@Param('clinicId') clinicId: string, @Param('itemId') itemId: string) {
    return this.service.detail(clinicId, itemId);
  }

  @Patch('clinics/:clinicId/items/:itemId')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({ summary: 'Altera insumo (If-Match obrigatório; o código não muda) (E-04)' })
  update(@Param('clinicId') clinicId: string, @Param('itemId') itemId: string, @Body() body: Record<string, unknown>) {
    return this.service.update(clinicId, itemId, body);
  }

  @Post('clinics/:clinicId/items/:itemId/deactivate')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({ summary: 'Inativa o insumo (nunca apaga se há saldo) (E-05)' })
  deactivate(@Param('clinicId') clinicId: string, @Param('itemId') itemId: string) {
    return this.service.deactivate(clinicId, itemId);
  }

  @Post('clinics/:clinicId/items/:itemId/reactivate')
  @RequirePermissions('stock:catalog:write')
  @ApiOperation({ summary: 'Reativa o insumo (E-05)' })
  reactivate(@Param('clinicId') clinicId: string, @Param('itemId') itemId: string) {
    return this.service.reactivate(clinicId, itemId);
  }

  @Get('catalog/units')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Lista de unidades de medida (E-06)' })
  units() {
    return this.service.units();
  }
}
