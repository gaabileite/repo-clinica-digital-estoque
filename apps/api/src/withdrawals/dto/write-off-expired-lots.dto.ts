import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const WRITE_OFF_MAX_LOTS = 100;
export const DEFAULT_WRITE_OFF_REASON = 'Perda por validade';

/** Body of POST /clinics/{clinicId}/expired-lots/write-off (E-23, requirement RF-15). Idempotency-Key is required. */
export class WriteOffExpiredLotsDto {
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    maxItems: WRITE_OFF_MAX_LOTS,
    description:
      'Lotes a baixar, um a um. Sem esta lista, baixa todos os lotes vencidos com saldo da clínica (atalho do RF-15).',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(WRITE_OFF_MAX_LOTS)
  @IsUUID('all', { each: true })
  lotIds?: string[];

  @ApiPropertyOptional({
    maxLength: 500,
    example: 'Conferência mensal de validade',
    description: `Motivo registrado em cada lançamento. Padrão: "${DEFAULT_WRITE_OFF_REASON}".`,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}