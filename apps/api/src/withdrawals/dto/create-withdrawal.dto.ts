import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export const WITHDRAWAL_KINDS = ['consumption', 'expiry-loss', 'damage-discard', 'loan', 'donation'] as const;
export type WithdrawalKind = (typeof WITHDRAWAL_KINDS)[number];

/** Corpo de POST /clinics/{clinicId}/withdrawals (E-18, RF-09, RF-10, RF-15). Idempotency-Key obrigatório. */
export class CreateWithdrawalDto {
  @ApiProperty({ example: 'INS-0001', description: 'Código do insumo (chave de negócio).' })
  @IsString() @IsNotEmpty() @MaxLength(40)
  code!: string;

  @ApiProperty({ example: '2.000', description: 'Decimal positivo em string, até 3 casas.' })
  @IsString()
  @Matches(/^(?!0+(\.0+)?$)\d{1,11}(\.\d{1,3})?$/, { message: 'quantity deve ser um decimal positivo com até 3 casas, ex.: "2.500".' })
  quantity!: string;

  @ApiProperty({ enum: WITHDRAWAL_KINDS })
  @IsIn(WITHDRAWAL_KINDS as unknown as string[])
  kind!: WithdrawalKind;

  @ApiPropertyOptional({ description: 'Escolhe outro lote que não o sugerido (RN-09). Obrigatório na perda por validade.' })
  @IsOptional() @IsUUID()
  lotId?: string;

  @ApiPropertyOptional({ description: 'Obrigatório em empréstimo e doação.', maxLength: 200 })
  @IsOptional() @IsString() @MaxLength(200)
  recipient?: string;

  @ApiPropertyOptional({ description: 'Obrigatório em descarte por avaria e perda por validade.', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}
