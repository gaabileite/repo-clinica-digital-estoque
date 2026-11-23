import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/** Query of GET /clinics/{clinicId}/items/{itemId}/availability (E-14). */
export class AvailabilityQueryDto {
  @ApiProperty({ example: '2.500', description: 'Quantidade pedida: string decimal positiva, até 3 casas.' })
  @IsString()
  @Matches(/^(?!0+(\.0+)?$)\d{1,11}(\.\d{1,3})?$/, { message: 'quantity deve ser um decimal positivo com até 3 casas, ex.: "2.500".' })
  quantity!: string;
}
