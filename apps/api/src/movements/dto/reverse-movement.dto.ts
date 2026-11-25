import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

/** Corpo de POST /clinics/{clinicId}/movements/{movementId}/reversals (E-25, E4-H7). Idempotency-Key obrigatório. */
export class ReverseMovementDto {
  @ApiProperty({ example: 'Retirada lançada no insumo errado.', maxLength: 500, description: 'Motivo do estorno. Obrigatório.' })
  @IsString() @MaxLength(500)
  reason!: string;
}
