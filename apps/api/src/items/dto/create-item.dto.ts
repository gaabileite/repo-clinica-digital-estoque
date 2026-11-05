import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * Corpo de POST /clinics/{clinicId}/items (E-02, RF-05).
 * Nomes em inglês (o contrato v0.11 usava `nome`, `controlaLoteValidade` etc.; padronizado na v0.12).
 */
export class CreateItemDto {
  @ApiProperty({ example: 'Luva de procedimento M (cx 100)' })
  @IsString() @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Categoria de insumo da clínica (RF-06).' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 'cx' })
  @IsString() @IsNotEmpty()
  unit!: string;

  @ApiPropertyOptional({ description: 'Se registra temperatura de armazenamento.' })
  @IsOptional() @IsBoolean()
  recordsTemperature?: boolean;

  @ApiPropertyOptional({ example: '2 a 8 °C', description: 'Faixa de temperatura, quando registra temperatura.' })
  @IsOptional() @IsString()
  temperatureRange?: string;

  @ApiProperty({ description: 'Controle de lote e validade (opcional por insumo).' })
  @IsBoolean()
  tracksLotAndExpiry!: boolean;

  @ApiProperty({ example: 7, description: 'Tempo de reposição estimado, em dias (RN-03).' })
  @IsInt() @Min(0)
  estimatedLeadTimeDays!: number;

  @ApiPropertyOptional({ example: 30, default: 30, description: 'Antecedência do alerta de validade, em dias (RF-08).' })
  @IsOptional() @IsInt() @Min(0)
  expiryAlertLeadDays?: number;
}
