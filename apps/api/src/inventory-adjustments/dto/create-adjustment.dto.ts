import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Body of POST /clinics/{clinicId}/lots/{lotId}/adjustments (E-26, requirement RF-17). */
export class CreateAdjustmentDto {
  @ApiProperty({
    example: '12.500',
    description: 'Quantidade contada no lote: decimal não negativo, até 3 casas (zero é permitido).',
  })
  @IsString()
  @Matches(/^\d{1,11}(\.\d{1,3})?$/, {
    message: 'countedQuantity deve ser um decimal não negativo com até 3 casas, ex.: "12.500".',
  })
  countedQuantity!: string;

  @ApiPropertyOptional({
    example: 'Contagem física de novembro',
    maxLength: 500,
    description: 'Obrigatória: se vazia, a API responde 422 STOCK_JUSTIFICATION_REQUIRED.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  justification?: string;
}