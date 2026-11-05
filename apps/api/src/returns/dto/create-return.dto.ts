import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Corpo de POST /clinics/{clinicId}/returns (E-24, RF-13). */
export class CreateReturnDto {
  @ApiProperty({ example: 'INS-0001' })
  @IsString() @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: '1.000' })
  @IsString() @IsNotEmpty()
  quantity!: string;

  @ApiPropertyOptional({ description: 'Lote existente. Sem ele, informe newLotCode e newLotExpiresOn.' })
  @IsOptional() @IsString()
  lotId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  newLotCode?: string;

  @ApiPropertyOptional({ example: '2027-03-01' }) @IsOptional() @IsString()
  newLotExpiresOn?: string;

  @ApiProperty({ description: 'Quem retirou e devolveu.' })
  @IsString() @IsNotEmpty()
  returnedBy!: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  note?: string;
}
