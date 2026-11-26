import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import type { AuthContext } from '../access/auth-context';
import { requireAuth } from '../access/require-auth';
import { Idempotent } from '../common/idempotency/idempotency';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { PendingRequestDto } from './dto/pending-request.dto';
import { ReceiptDto } from './dto/receipt-response.dto';
import { PendingRequestsService } from './pending-requests.service';
import { ReceiptsService } from './receipts.service';

@ApiTags('receipts')
@Controller()
export class ReceiptsController {
  constructor(
    private readonly service: ReceiptsService,
    private readonly pending: PendingRequestsService,
  ) {}

  @Post('clinics/:clinicId/receipts')
  @RequirePermissions('stock:receive')
  @Idempotent()
  @ApiOperation({ summary: 'Registra a entrada e emite a nota de recebimento (E-27)' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Reenviar com o mesmo corpo devolve a resposta original.' })
  @ApiCreatedResponse({ type: ReceiptDto })
  create(
    @Param('clinicId', new ParseUUIDPipe()) clinicId: string,
    @CurrentAuth() auth: AuthContext | undefined,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CreateReceiptDto,
  ) {
    return this.service.create(clinicId, requireAuth(auth), idempotencyKey.trim(), body);
  }

  @Get('clinics/:clinicId/receipts')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Lista notas de recebimento (E-28)' })
  list(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.list(clinicId, query);
  }

  @Get('clinics/:clinicId/receipts/:receiptId')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Detalhe da nota, linhas e divergências (E-29)' })
  detail(@Param('clinicId') clinicId: string, @Param('receiptId') receiptId: string) {
    return this.service.detail(clinicId, receiptId);
  }

  @Get('clinics/:clinicId/receipts/:receiptId/document')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'PDF da nota (URL assinada do módulo de Arquivos) (E-30)' })
  document(@Param('clinicId') clinicId: string, @Param('receiptId') receiptId: string) {
    return this.service.document(clinicId, receiptId);
  }

  @Post('clinics/:clinicId/receipts/:receiptId/reversals')
  @RequirePermissions('stock:receive')
  @Idempotent()
  @ApiOperation({ summary: 'Pede o estorno da nota (409 se algum lote foi movimentado) (E-31)' })
  reverse(@Param('clinicId') clinicId: string, @Param('receiptId') receiptId: string, @Body() body: Record<string, unknown>) {
    return this.service.reverse(clinicId, receiptId, body);
  }

  @Get('clinics/:clinicId/pending-requests')
  @RequirePermissions('stock:receive')
  @ApiOperation({ summary: 'Requisições em aberto para importar a data do pedido (E-32)' })
  @ApiOkResponse({ type: PendingRequestDto, isArray: true })
  pendingRequests(@Param('clinicId', new ParseUUIDPipe()) clinicId: string) {
    return this.pending.list(clinicId);
  }
}