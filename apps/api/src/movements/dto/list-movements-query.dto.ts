import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { MOVEMENT_KINDS, type MovementKindName } from '../movement-kinds';

const DATE_OR_INSTANT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

/** Query de GET /clinics/{clinicId}/movements (E-39, E4-H6). Todo filtro é opcional. */
export class ListMovementsQueryDto {
  @ApiPropertyOptional({ description: 'Insumo (id).' })
  @IsOptional() @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({ description: 'Código do insumo, ex.: INS-0001.', maxLength: 40 })
  @IsOptional() @IsString() @MaxLength(40)
  code?: string;

  @ApiPropertyOptional({ enum: MOVEMENT_KINDS, description: 'Categoria da movimentação.' })
  @IsOptional() @IsIn(MOVEMENT_KINDS as unknown as string[])
  kind?: MovementKindName;

  @ApiPropertyOptional({ description: 'Usuário que fez a movimentação (id).', maxLength: 80 })
  @IsOptional() @IsString() @MaxLength(80)
  userId?: string;

  @ApiPropertyOptional({ description: 'Código do lote (contém, sem diferenciar maiúsculas).', maxLength: 60 })
  @IsOptional() @IsString() @MaxLength(60)
  lot?: string;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Início do período: data civil (começa à 00:00 de America/Recife) ou instante ISO 8601 com fuso.',
  })
  @IsOptional() @Matches(DATE_OR_INSTANT, { message: 'from deve ser uma data AAAA-MM-DD ou um instante ISO 8601 com fuso.' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Fim do período: data civil (vale o dia inteiro, até 23:59 de America/Recife) ou instante ISO 8601 com fuso.',
  })
  @IsOptional() @Matches(DATE_OR_INSTANT, { message: 'to deve ser uma data AAAA-MM-DD ou um instante ISO 8601 com fuso.' })
  to?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor da página seguinte (`page.nextCursor`).' })
  @IsOptional() @IsString() @MaxLength(500)
  cursor?: string;
}
