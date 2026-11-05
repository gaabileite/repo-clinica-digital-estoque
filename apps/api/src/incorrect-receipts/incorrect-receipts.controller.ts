import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { Idempotent } from '../common/idempotency/idempotency';
import { IncorrectReceiptsService } from './incorrect-receipts.service';

@ApiTags('incorrect-receipts')
@Controller()
export class IncorrectReceiptsController {
  constructor(private readonly service: IncorrectReceiptsService) {}

  @Get('clinics/:clinicId/incorrect-receipts')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Recebimentos incorretos, com prazo restante (E-34)' })
  list(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.list(clinicId, query);
  }

  @Post('clinics/:clinicId/incorrect-receipts')
  @RequirePermissions('stock:receive')
  @ApiOperation({ summary: 'Registra produto recebido incorretamente (E-35)' })
  create(@Param('clinicId') clinicId: string, @Body() body: Record<string, unknown>) {
    return this.service.create(clinicId, body);
  }

  @Post('clinics/:clinicId/incorrect-receipts/:id/exchange')
  @RequirePermissions('stock:receive')
  @ApiOperation({ summary: 'Registra a troca pela empresa (E-36)' })
  exchange(@Param('clinicId') clinicId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.exchange(clinicId, id, body);
  }

  @Post('clinics/:clinicId/incorrect-receipts/:id/incorporation')
  @RequirePermissions('stock:receive')
  @Idempotent()
  @ApiOperation({ summary: 'Incorpora ao estoque após o prazo (gera entrada) (E-37)' })
  incorporate(@Param('clinicId') clinicId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.incorporate(clinicId, id, body);
  }

  @Post('clinics/:clinicId/incorrect-receipts/:id/disposal')
  @RequirePermissions('stock:receive')
  @ApiOperation({ summary: 'Descarta após o prazo, com justificativa (E-38)' })
  discard(@Param('clinicId') clinicId: string, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.discard(clinicId, id, body);
  }
}
