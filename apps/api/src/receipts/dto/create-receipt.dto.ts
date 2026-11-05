import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export const RECEIPT_ORIGINS = ['central-warehouse', 'other-clinic', 'external-donation', 'other'] as const;
export type ReceiptOrigin = (typeof RECEIPT_ORIGINS)[number];

export class ReceiptLineDto {
  @ApiProperty({ example: 'INS-0001' }) @IsString() @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: '10.000' }) @IsString() @IsNotEmpty()
  receivedQuantity!: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  lotCode?: string;

  @ApiPropertyOptional({ example: '2027-03-01' }) @IsOptional() @IsString()
  expiresOn?: string;
}

/** Corpo de POST /clinics/{clinicId}/receipts (E-27, RF-18, RF-23). Idempotency-Key obrigatório. */
export class CreateReceiptDto {
  @ApiProperty({ enum: RECEIPT_ORIGINS })
  @IsIn(RECEIPT_ORIGINS as unknown as string[])
  origin!: ReceiptOrigin;

  @ApiPropertyOptional({ description: 'other-clinic: só registra a origem, sem fluxo de transferência.' })
  @IsOptional() @IsString()
  originClinicId?: string;

  @ApiPropertyOptional({ description: 'Obrigatório quando origin = other.' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Obrigatório quando origin = external-donation.' })
  @IsOptional() @IsString()
  donorLetterFileId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  proofFileId?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Data do pedido (não se aplica a doação).' })
  @IsOptional() @IsString()
  orderedOn?: string;

  @ApiPropertyOptional({ description: 'Importa a data do pedido de uma requisição em aberto.' })
  @IsOptional() @IsString()
  requestId?: string;

  @ApiPropertyOptional({ example: '2026-11-05', description: 'Padrão: hoje. Não pode ser futura.' })
  @IsOptional() @IsString()
  receivedOn?: string;

  @ApiProperty({ type: () => [ReceiptLineDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ReceiptLineDto)
  lines!: ReceiptLineDto[];
}
