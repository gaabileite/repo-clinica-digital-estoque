import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { Idempotent } from '../common/idempotency/idempotency';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';

@ApiTags('inventory-adjustments')
@Controller()
export class InventoryAdjustmentsController {
  constructor(private readonly service: InventoryAdjustmentsService) {}

  @Post('clinics/:clinicId/lots/:lotId/adjustments')
  @RequirePermissions('stock:adjust')
  @Idempotent()
  @ApiOperation({ summary: 'Ajuste de inventário de um lote, com justificativa (E-26)' })
  create(@Param('clinicId') clinicId: string, @Param('lotId') lotId: string, @Body() body: Record<string, unknown>) {
    return this.service.create(clinicId, lotId, body);
  }
}
