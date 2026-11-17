import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { BALANCE_SORT_FIELDS } from '../balance-list';

const SITUATIONS = ['adequate', 'reorder', 'critical', 'out-of-stock'] as const;
const SORTS = BALANCE_SORT_FIELDS.flatMap((f) => [f, `-${f}`]);

/** Query of GET /clinics/{clinicId}/balances (E-12, E3-H1). Every filter is optional. */
export class ListBalancesQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou código, sem diferenciar maiúsculas nem acentos.', maxLength: 120 })
  @IsOptional() @IsString() @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ description: 'Categoria de insumo (id).' })
  @IsOptional() @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: SITUATIONS, description: 'Situação do estoque (RN-01).' })
  @IsOptional() @IsIn(SITUATIONS as unknown as string[])
  situation?: (typeof SITUATIONS)[number];

  @ApiPropertyOptional({ enum: ['expired', 'expiring'], description: 'Tem lote vencido ou lote a vencer (RN-08).' })
  @IsOptional() @IsIn(['expired', 'expiring'])
  expiry?: 'expired' | 'expiring';

  @ApiPropertyOptional({ minimum: 1, maximum: 365, description: 'Validade mais próxima (de lote utilizável) em até N dias.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365)
  expiringWithinDays?: number;

  @ApiPropertyOptional({ enum: ['yes', 'no'], description: 'Com ou sem controle de lote e validade.' })
  @IsOptional() @IsIn(['yes', 'no'])
  lotControl?: 'yes' | 'no';

  @ApiPropertyOptional({ enum: ['yes', 'no'], description: 'Registra ou não temperatura de armazenamento.' })
  @IsOptional() @IsIn(['yes', 'no'])
  temperature?: 'yes' | 'no';

  @ApiPropertyOptional({ enum: ['true', 'false', 'all'], default: 'true', description: 'Insumos ativos (padrão), inativos ou todos.' })
  @IsOptional() @IsIn(['true', 'false', 'all'])
  active?: 'true' | 'false' | 'all';

  @ApiPropertyOptional({ enum: SORTS, default: '-criticalLevel', description: 'Campo de ordenação; o prefixo `-` inverte. Valores nulos ficam por último.' })
  @IsOptional() @IsIn(SORTS)
  sort?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor devolvido em `page.nextCursor`.' })
  @IsOptional() @IsString() @MaxLength(200)
  cursor?: string;
}
