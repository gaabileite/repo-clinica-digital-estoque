import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { RECEIPT_ORIGINS, type ReceiptOrigin } from './create-receipt.dto';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const RECEIPT_STATUSES = ['active', 'reversed'] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

/** Query de GET /clinics/{clinicId}/receipts (E-28, E5-H3). Todo filtro é opcional. */
export class ListReceiptsQueryDto {
  @ApiPropertyOptional({ example: '2026-11-01', description: 'Início do período sobre a data de recebimento (inclusivo), AAAA-MM-DD.' })
  @IsOptional() @IsString() @Matches(DATE, { message: 'from deve ser uma data AAAA-MM-DD.' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'Fim do período sobre a data de recebimento (inclusivo), AAAA-MM-DD.' })
  @IsOptional() @IsString() @Matches(DATE, { message: 'to deve ser uma data AAAA-MM-DD.' })
  to?: string;

  @ApiPropertyOptional({ enum: RECEIPT_ORIGINS, description: 'Origem da entrada.' })
  @IsOptional() @IsIn(RECEIPT_ORIGINS as unknown as string[])
  origin?: ReceiptOrigin;

  @ApiPropertyOptional({ enum: RECEIPT_STATUSES, description: '`active`: nota vigente. `reversed`: nota estornada.' })
  @IsOptional() @IsIn(RECEIPT_STATUSES as unknown as string[])
  status?: ReceiptStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor da página seguinte (`page.nextCursor`).' })
  @IsOptional() @IsString() @MaxLength(500)
  cursor?: string;
}
