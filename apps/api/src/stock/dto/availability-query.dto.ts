import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

/** Query of GET /clinics/{clinicId}/items/{itemId}/availability (E-14). */
export class AvailabilityQueryDto {
  @ApiProperty({ example: '2.500', description: 'Quantidade pedida: string decimal positiva, até 3 casas.' })
  @IsString()
  @Matches(/^(?!0+(\.0+)?$)\d{1,11}(\.\d{1,3})?$/, { message: 'quantity deve ser um decimal positivo com até 3 casas, ex.: "2.500".' })
  quantity!: string;

  @ApiPropertyOptional({ description: 'Lote que o usuário pretende usar em vez do sugerido (RN-09): a resposta avisa se não for o de validade mais próxima.' })
  @IsOptional() @IsUUID()
  lotId?: string;
}
