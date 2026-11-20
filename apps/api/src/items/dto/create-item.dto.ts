import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Corpo de POST /clinics/{clinicId}/items (E-02, RF-05).
 * Nomes em inglês (o contrato v0.11 usava `nome`, `controlaLoteValidade` etc.; padronizado na v0.12).
 */
export class CreateItemDto {
  @ApiProperty({ example: 'Luva de procedimento M (cx 100)' })
  @Transform(({ obj, key }) => (typeof obj[key] === 'string' ? obj[key].trim() : obj[key]))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ description: 'Categoria de insumo da clínica (RF-06).' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 'cx' })
  @Transform(({ obj, key }) => (typeof obj[key] === 'string' ? obj[key].trim() : obj[key]))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  unit!: string;

  @ApiPropertyOptional({
    description: 'Se registra temperatura de armazenamento.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ obj, key }) => obj[key])
  @IsBoolean()
  recordsTemperature?: boolean;

  @ApiPropertyOptional({
    example: '2 a 8 °C',
    description: 'Faixa de temperatura, quando registra temperatura.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ obj, key }) => (typeof obj[key] === 'string' ? obj[key].trim() : obj[key]))
  @IsString()
  @MaxLength(120)
  temperatureRange?: string;

  @ApiProperty({
    description: 'Controle de lote e validade (opcional por insumo).',
  })
  @Transform(({ obj, key }) => obj[key])
  @IsBoolean()
  tracksLotAndExpiry!: boolean;

  @ApiProperty({
    example: 7,
    description: 'Tempo de reposição estimado, em dias (RN-03).',
  })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  estimatedLeadTimeDays!: number;

  @ApiPropertyOptional({
    example: 30,
    default: 30,
    description: 'Antecedência do alerta de validade, em dias (RF-08).',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expiryAlertLeadDays?: number;
}
