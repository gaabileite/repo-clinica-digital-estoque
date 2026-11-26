import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'a data deve estar no formato AAAA-MM-DD.';

/** Removes spaces at both ends. */
const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

/** Body of POST /clinics/{clinicId}/incorrect-receipts (E-35, requirement RF-25). */
export class CreateIncorrectReceiptDto {
  @ApiProperty({ example: 'Luva G no lugar da M', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description!: string;

  @ApiProperty({ example: '10.000', description: 'Decimal positivo em string, até 3 casas.' })
  @IsString()
  @Matches(/^(?!0+(\.0+)?$)\d{1,11}(\.\d{1,3})?$/, {
    message: 'quantity deve ser um decimal positivo com até 3 casas, ex.: "10.000".',
  })
  quantity!: string;

  @ApiProperty({ example: 'cx', maxLength: 20 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit!: string;

  @ApiProperty({ example: 'Distribuidora Alfa', maxLength: 120, description: 'Empresa fornecedora, em texto livre (decisão D5).' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  supplier!: string;

  @ApiProperty({ example: '2026-10-11', description: 'Data em que a empresa foi notificada (AAAA-MM-DD). Não pode ser futura. Inicia o prazo.' })
  @IsString()
  @Matches(CIVIL_DATE, { message: `notifiedOn: ${DATE_MESSAGE}` })
  notifiedOn!: string;

  @ApiPropertyOptional({ maxLength: 500, description: 'Observações.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Body of POST .../incorrect-receipts/{id}/exchange (E-36). */
export class ExchangeIncorrectReceiptDto {
  @ApiPropertyOptional({ example: '2026-11-20', description: 'Data da troca (AAAA-MM-DD). Padrão: hoje.' })
  @IsOptional()
  @IsString()
  @Matches(CIVIL_DATE, { message: `exchangedOn: ${DATE_MESSAGE}` })
  exchangedOn?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Body of POST .../incorrect-receipts/{id}/incorporation (E-37). Idempotency-Key is required. */
export class IncorporateIncorrectReceiptDto {
  @ApiProperty({ example: 'INS-0001', description: 'Código do insumo que recebe o produto.' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  itemCode!: string;

  @ApiPropertyOptional({ example: 'LV-999', maxLength: 60, description: 'Obrigatório quando o insumo controla lote e validade.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  lotCode?: string;

  @ApiPropertyOptional({ example: '2027-12-01', description: 'Obrigatória quando o insumo controla lote e validade (AAAA-MM-DD).' })
  @IsOptional()
  @IsString()
  @Matches(CIVIL_DATE, { message: `expiresOn: ${DATE_MESSAGE}` })
  expiresOn?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  justification?: string;
}

/**
 * Body of POST .../incorrect-receipts/{id}/disposal (E-38).
 * The justification is optional HERE on purpose: the service answers a missing one with 422
 * STOCK_JUSTIFICATION_REQUIRED (contract code); checking it in the DTO would make the pipe answer 400 first.
 */
export class DiscardIncorrectReceiptDto {
  @ApiPropertyOptional({ maxLength: 500, description: 'Obrigatória: se vazia, a API responde 422 STOCK_JUSTIFICATION_REQUIRED.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  justification?: string;
}