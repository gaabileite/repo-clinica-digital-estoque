import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAuth, RequirePermissions } from '../access/access.decorators';
import type { AuthContext } from '../access/auth-context';
import { requireAuth } from '../access/require-auth';
import { Idempotent } from '../common/idempotency/idempotency';
import { ReverseMovementDto } from './dto/reverse-movement.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import { MovementDto, MovementPageDto } from './dto/movement-response.dto';
import { MovementsService } from './movements.service';

@ApiTags('movements')
@Controller()
export class MovementsController {
  constructor(private readonly service: MovementsService) {}

  @Get('clinics/:clinicId/movements')
  @RequirePermissions('stock:read')
  @ApiOperation({ summary: 'Livro de movimentações (cursor, filtros) (E-39)' })
  @ApiOkResponse({ type: MovementPageDto })
  list(@Param('clinicId', new ParseUUIDPipe()) clinicId: string, @Query() query: ListMovementsQueryDto) {
    return this.service.list(clinicId, query);
  }

  @Post('clinics/:clinicId/movements/:movementId/reversals')
  // Quem tem `stock:reverse` estorna qualquer saída; quem só tem `stock:withdraw` estorna a própria, em até 24 h (RN-07).
  @RequirePermissions('stock:withdraw')
  @Idempotent()
  @ApiOperation({ summary: 'Estorna uma saída; o original permanece (E-25)' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Reenviar com o mesmo corpo devolve a resposta original.' })
  @ApiCreatedResponse({ type: MovementDto, description: 'O lançamento de estorno.' })
  reverse(
    @Param('clinicId', new ParseUUIDPipe()) clinicId: string,
    @Param('movementId', new ParseUUIDPipe()) movementId: string,
    @CurrentAuth() auth: AuthContext | undefined,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: ReverseMovementDto,
  ) {
    return this.service.reverse(clinicId, movementId, requireAuth(auth), idempotencyKey.trim(), body);
  }
}
