import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const DEFAULT_WEEKS = 8;
export const MAX_WEEKS = 26;

/** Query of GET /clinics/{clinicId}/dashboard/weekly-consumption (E-17). */
export class WeeklyConsumptionQueryDto {
  @ApiProperty({ example: 'INS-0001', description: 'Código do insumo. Obrigatório: unidades diferentes não se somam.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  itemCode!: string;

  @ApiPropertyOptional({ example: DEFAULT_WEEKS, default: DEFAULT_WEEKS, minimum: 1, maximum: MAX_WEEKS })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_WEEKS)
  weeks?: number;
}