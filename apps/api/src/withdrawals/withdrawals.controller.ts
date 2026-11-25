import { Body, Controller, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import type { AuthContext } from '../access/auth-context';
import { Idempotent } from '../common/idempotency/idempotency';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WithdrawalDto } from './dto/withdrawal-response.dto';
import { WithdrawalsService } from './withdrawals.service';

@ApiTags('withdrawals')
@Controller()
export class WithdrawalsController {
  constructor(private readonly service: WithdrawalsService) {}

  @Post('clinics/:clinicId/withdrawals')
  @RequirePermissions('stock:withdraw')
  @Idempotent()
  @ApiOperation({ summary: 'Retirada pelo código do insumo, com lote sugerido pelo FEFO (E-18)' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Chave de idempotência: reenviar com o mesmo corpo devolve a resposta original.' })
  @ApiCreatedResponse({ type: WithdrawalDto })
  create(
    @Param('clinicId', new ParseUUIDPipe()) clinicId: string,
    @CurrentAuth() auth: AuthContext,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CreateWithdrawalDto,
  ) {
    return this.service.create(clinicId, auth.userId, idempotencyKey.trim(), body);
  }

  @Post('clinics/:clinicId/expired-lots/write-off')
  @RequirePermissions('stock:withdraw')
  @Idempotent()
  @ApiOperation({ summary: 'Baixa lotes vencidos como perda por validade (E-23)' })
  writeOffExpiredLots(@Param('clinicId') clinicId: string, @Body() body: Record<string, unknown>) {
    return this.service.writeOffExpiredLots(clinicId, body);
  }
}
