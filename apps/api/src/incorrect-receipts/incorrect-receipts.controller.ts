import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import type { AuthContext } from '../access/auth-context';
import { requireAuth } from '../access/require-auth';
import { Idempotent } from '../common/idempotency/idempotency';
import {
  CreateIncorrectReceiptDto,
  DiscardIncorrectReceiptDto,
  ExchangeIncorrectReceiptDto,
  IncorporateIncorrectReceiptDto,
} from './dto/incorrect-receipt-requests.dto';
import { IncorporationDto, IncorrectReceiptDto } from './dto/incorrect-receipt-responses.dto';
import { IncorrectReceiptsService } from './incorrect-receipts.service';

@ApiTags('incorrect-receipts')
@Controller()
export class IncorrectReceiptsController {
  constructor(private readonly service: IncorrectReceiptsService) {}

  @Get('clinics/:clinicId/incorrect-receipts')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Recebimentos incorretos, com prazo restante (E-34)' })
  @ApiOkResponse({ type: IncorrectReceiptDto, isArray: true })
  list(@Param('clinicId', ParseUUIDPipe) clinicId: string) {
    return this.service.list(clinicId);
  }

  @Post('clinics/:clinicId/incorrect-receipts')
  @RequirePermissions('stock:receive')
  @ApiOperation({ summary: 'Registra produto recebido incorretamente (E-35)' })
  @ApiCreatedResponse({ type: IncorrectReceiptDto })
  create(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @CurrentAuth() auth: AuthContext | undefined,
    @Body() body: CreateIncorrectReceiptDto,
  ) {
    return this.service.create(clinicId, requireAuth(auth), body);
  }

  @Post('clinics/:clinicId/incorrect-receipts/:id/exchange')
  @RequirePermissions('stock:receive')
  @ApiOperation({ summary: 'Registra a troca pela empresa (E-36)' })
  @ApiCreatedResponse({ type: IncorrectReceiptDto })
  exchange(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAuth() auth: AuthContext | undefined,
    @Body() body: ExchangeIncorrectReceiptDto,
  ) {
    return this.service.exchange(clinicId, id, requireAuth(auth), body);
  }

  @Post('clinics/:clinicId/incorrect-receipts/:id/incorporation')
  @RequirePermissions('stock:receive')
  @Idempotent()
  @ApiOperation({
    summary: 'Incorpora ao estoque após o prazo (gera entrada) (E-37)',
    description: 'Só depois do prazo (409 STOCK_DEADLINE_NOT_REACHED antes). Informe o insumo; lote e validade se ele controla lote.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Reenviar com o mesmo corpo devolve a resposta original.' })
  @ApiCreatedResponse({ type: IncorporationDto })
  incorporate(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAuth() auth: AuthContext | undefined,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: IncorporateIncorrectReceiptDto,
  ) {
    return this.service.incorporate(clinicId, id, requireAuth(auth), idempotencyKey.trim(), body);
  }

  @Post('clinics/:clinicId/incorrect-receipts/:id/disposal')
  @RequirePermissions('stock:receive')
  @ApiOperation({
    summary: 'Descarta após o prazo, com justificativa (E-38)',
    description: 'Só depois do prazo (409 antes). Não altera o saldo.',
  })
  @ApiCreatedResponse({ type: IncorrectReceiptDto })
  discard(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAuth() auth: AuthContext | undefined,
    @Body() body: DiscardIncorrectReceiptDto,
  ) {
    return this.service.discard(clinicId, id, requireAuth(auth), body);
  }
}