import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateNested } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const RECEIPT_ORIGINS = ['central-warehouse', 'other-clinic', 'external-donation', 'other'] as const;
export type ReceiptOrigin = (typeof RECEIPT_ORIGINS)[number];

export class ReceiptLineDto {
  @ApiProperty({ example: 'INS-0001' }) @IsString() @IsNotEmpty() @MaxLength(40)
  code!: string;

  @ApiProperty({ example: '10.000', description: 'Decimal positivo em string, até 3 casas.' })
  @IsString()
  @Matches(/^(?!0+(\.0+)?$)\d{1,11}(\.\d{1,3})?$/, { message: 'receivedQuantity deve ser um decimal positivo com até 3 casas, ex.: "10.000".' })
  receivedQuantity!: string;

  @ApiPropertyOptional({ description: 'Obrigatório para insumo com controle de lote. Sem controle, o saldo vai para o lote único "-".', maxLength: 60 })
  @IsOptional() @IsString() @MaxLength(60)
  lotCode?: string;

  @ApiPropertyOptional({ example: '2027-03-01', description: 'Data civil (AAAA-MM-DD). Obrigatória para insumo com controle de lote.' })
  @IsOptional() @IsString() @Matches(DATE, { message: 'expiresOn deve ser uma data AAAA-MM-DD.' })
  expiresOn?: string;
}

/** Corpo de POST /clinics/{clinicId}/receipts (E-27, RF-18, RF-23). Idempotency-Key obrigatório. */
export class CreateReceiptDto {
  @ApiProperty({ enum: RECEIPT_ORIGINS })
  @IsIn(RECEIPT_ORIGINS as unknown as string[])
  origin!: ReceiptOrigin;

  @ApiPropertyOptional({ description: 'other-clinic: só registra a origem, sem fluxo de transferência.' })
  @IsOptional() @IsUUID()
  originClinicId?: string;

  @ApiPropertyOptional({ description: 'Obrigatório quando origin = other.' })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Obrigatório quando origin = external-donation.' })
  @IsOptional() @IsString() @MaxLength(200)
  donorLetterFileId?: string;

  @ApiPropertyOptional({ description: 'Comprovante, opcional em qualquer origem.' }) @IsOptional() @IsString() @MaxLength(200)
  proofFileId?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Data do pedido (não se aplica a doação).' })
  @IsOptional() @IsString() @Matches(DATE, { message: 'orderedOn deve ser uma data AAAA-MM-DD.' })
  orderedOn?: string;

  @ApiPropertyOptional({ description: 'Importa a data do pedido de uma requisição em aberto.' })
  @IsOptional() @IsString() @MaxLength(100)
  requestId?: string;

  @ApiPropertyOptional({ example: '2026-11-05', description: 'Padrão: hoje. Não pode ser futura.' })
  @IsOptional() @IsString() @Matches(DATE, { message: 'receivedOn deve ser uma data AAAA-MM-DD.' })
  receivedOn?: string;

  @ApiProperty({ type: () => [ReceiptLineDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => ReceiptLineDto)
  lines!: ReceiptLineDto[];
}
