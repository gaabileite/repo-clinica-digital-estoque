import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const WITHDRAWAL_KINDS = ['consumption', 'expiry-loss', 'damage-discard', 'loan', 'donation'] as const;
export type WithdrawalKind = (typeof WITHDRAWAL_KINDS)[number];

/** Corpo de POST /clinics/{clinicId}/withdrawals (E-18, RF-09, RF-10, RF-15). Idempotency-Key obrigatório. */
export class CreateWithdrawalDto {
  @ApiProperty({ example: 'INS-0001', description: 'Código do insumo (chave de negócio).' })
  @IsString() @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: '2.000', description: 'Decimal em string, sem float.' })
  @IsString() @IsNotEmpty()
  quantity!: string;

  @ApiProperty({ enum: WITHDRAWAL_KINDS })
  @IsIn(WITHDRAWAL_KINDS as unknown as string[])
  kind!: WithdrawalKind;

  @ApiPropertyOptional({ description: 'Escolhe outro lote que não o sugerido (gera aviso, RN-09).' })
  @IsOptional() @IsString()
  lotId?: string;

  @ApiPropertyOptional({ description: 'Obrigatório em empréstimo e doação.' })
  @IsOptional() @IsString()
  recipient?: string;

  @ApiPropertyOptional({ description: 'Obrigatório em descarte por avaria e nos demais tipos que não são consumo.' })
  @IsOptional() @IsString()
  reason?: string;
}
