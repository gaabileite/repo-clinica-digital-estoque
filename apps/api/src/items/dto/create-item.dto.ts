import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * Corpo de POST /clinics/{clinicId}/items (E-02, RF-05).
 * Os nomes seguem o contrato v0.11, que mistura português e inglês nos campos; padronizar na v0.12.
 */
export class CreateItemDto {
  @ApiProperty({ example: 'Luva de procedimento M (cx 100)' })
  @IsString() @IsNotEmpty()
  nome!: string;

  @ApiProperty({ description: 'Categoria de insumo da clínica (RF-06).' })
  @IsString() @IsNotEmpty()
  categoria!: string;

  @ApiProperty({ example: 'cx' })
  @IsString() @IsNotEmpty()
  unidade!: string;

  @ApiPropertyOptional({ description: 'Se registra temperatura de armazenamento.' })
  @IsOptional() @IsBoolean()
  registraTemperatura?: boolean;

  @ApiProperty({ description: 'Controle de lote e validade (opcional por insumo).' })
  @IsBoolean()
  controlaLoteValidade!: boolean;

  @ApiProperty({ example: 7, description: 'Tempo de reposição estimado, em dias (RN-03).' })
  @IsInt() @Min(0)
  tempoReposicaoEstimadoDias!: number;

  @ApiPropertyOptional({ example: 30, description: 'Antecedência do alerta de validade, em dias (RF-08).' })
  @IsOptional() @IsInt() @Min(0)
  antecedenciaAlertaValidadeDias?: number;
}
