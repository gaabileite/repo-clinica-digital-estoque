import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { Idempotent } from '../common/idempotency/idempotency';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WithdrawalsService } from './withdrawals.service';

@ApiTags('withdrawals')
@Controller()
export class WithdrawalsController {
  constructor(private readonly service: WithdrawalsService) {}

  @Post('clinics/:clinicId/withdrawals')
  @RequirePermissions('stock:withdraw')
  @Idempotent()
  @ApiOperation({ summary: 'Retirada pelo código do insumo, com lote sugerido pelo FEFO (E-18)' })
  create(@Param('clinicId') clinicId: string, @Body() body: CreateWithdrawalDto) {
    return this.service.create(clinicId, body);
  }

  @Post('clinics/:clinicId/expired-lots/write-off')
  @RequirePermissions('stock:withdraw')
  @Idempotent()
  @ApiOperation({ summary: 'Baixa lotes vencidos como perda por validade (E-23)' })
  writeOffExpiredLots(@Param('clinicId') clinicId: string, @Body() body: Record<string, unknown>) {
    return this.service.writeOffExpiredLots(clinicId, body);
  }
}
