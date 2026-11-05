import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../access/access.decorators';
import { Idempotent } from '../common/idempotency/idempotency';
import { MovementsService } from './movements.service';

@ApiTags('movements')
@Controller()
export class MovementsController {
  constructor(private readonly service: MovementsService) {}

  @Get('clinics/:clinicId/movements')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Livro de movimentações (cursor, filtros) (E-39)' })
  list(@Param('clinicId') clinicId: string, @Query() query: Record<string, string>) {
    return this.service.list(clinicId, query);
  }

  @Post('clinics/:clinicId/movements/:movementId/reversals')
  @RequirePermissions('stock:reverse')
  @Idempotent()
  @ApiOperation({ summary: 'Estorna uma saída; o original permanece (E-25)' })
  reverse(@Param('clinicId') clinicId: string, @Param('movementId') movementId: string, @Body() body: Record<string, unknown>) {
    return this.service.reverse(clinicId, movementId, body);
  }
}
