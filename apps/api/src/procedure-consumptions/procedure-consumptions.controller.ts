import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { Idempotent } from '../common/idempotency/idempotency';
import { ProcedureConsumptionsService } from './procedure-consumptions.service';

@ApiTags('procedure-consumptions')
@Controller()
export class ProcedureConsumptionsController {
  constructor(private readonly service: ProcedureConsumptionsService) {}

  @Post('clinics/:clinicId/procedure-consumptions/preview')
  @RequirePermissions('stock:withdraw')
  @ApiOperation({ summary: 'Prévia da baixa de um pacote, sem baixar (E-19)' })
  preview(@Param('clinicId') clinicId: string, @Body() body: Record<string, unknown>) {
    return this.service.preview(clinicId, body);
  }

  @Post('clinics/:clinicId/procedure-consumptions')
  @RequirePermissions('stock:withdraw')
  @Idempotent()
  @ApiOperation({ summary: 'Confirma a baixa de um pacote de insumos (E-20)' })
  confirm(@Param('clinicId') clinicId: string, @Body() body: Record<string, unknown>) {
    return this.service.confirm(clinicId, body);
  }

  @Get('clinics/:clinicId/pending-consumptions')
  @RequirePermissions('stock:withdraw')
  @ApiOperation({ summary: 'Baixas pendentes geradas por execuções de procedimento (E-21)' })
  listPending(@Param('clinicId') clinicId: string) {
    return this.service.listPending(clinicId);
  }

  @Post('clinics/:clinicId/pending-consumptions/:pendingId/confirmation')
  @RequirePermissions('stock:withdraw')
  @Idempotent()
  @ApiOperation({ summary: 'Confirma a proposta, com ajustes e justificativa (E-22)' })
  confirmPending(@Param('clinicId') clinicId: string, @Param('pendingId') pendingId: string, @Body() body: Record<string, unknown>) {
    return this.service.confirmPending(clinicId, pendingId, body);
  }

  @Post('clinics/:clinicId/pending-consumptions/:pendingId/dismissal')
  @RequirePermissions('stock:withdraw')
  @ApiOperation({ summary: 'Descarta a proposta, com motivo (E-22)' })
  dismissPending(@Param('clinicId') clinicId: string, @Param('pendingId') pendingId: string, @Body() body: Record<string, unknown>) {
    return this.service.dismissPending(clinicId, pendingId, body);
  }
}
