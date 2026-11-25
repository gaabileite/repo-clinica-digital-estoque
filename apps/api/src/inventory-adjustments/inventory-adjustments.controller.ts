import { Body, Controller, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import type { AuthContext } from '../access/auth-context';
import { requireAuth } from '../access/require-auth';
import { Idempotent } from '../common/idempotency/idempotency';
import { AdjustmentDto } from './dto/adjustment.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';

@ApiTags('inventory-adjustments')
@Controller()
export class InventoryAdjustmentsController {
  constructor(private readonly service: InventoryAdjustmentsService) {}

  @Post('clinics/:clinicId/lots/:lotId/adjustments')
  @RequirePermissions('stock:adjust')
  @Idempotent()
  @ApiOperation({ summary: 'Ajuste de inventário de um lote, com justificativa (E-26)' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Chave única da operação (contrato, seção 2).' })
  @ApiCreatedResponse({ type: AdjustmentDto })
  create(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('lotId', ParseUUIDPipe) lotId: string,
    @CurrentAuth() auth: AuthContext | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreateAdjustmentDto,
  ) {
    // The interceptor already answered 400 when the header is missing, so it is always there by now.
    return this.service.create(clinicId, lotId, requireAuth(auth), idempotencyKey ?? '', body);
  }
}