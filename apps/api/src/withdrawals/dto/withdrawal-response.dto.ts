import { ApiProperty } from '@nestjs/swagger';
import { MovementDto } from '../../movements/dto/movement-response.dto';
import { WITHDRAWAL_KINDS, type WithdrawalKind } from './create-withdrawal.dto';

export class WithdrawalItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INS-0001' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
}

export class WithdrawalDto {
  @ApiProperty({ type: () => WithdrawalItemDto }) item!: WithdrawalItemDto;
  @ApiProperty({ enum: WITHDRAWAL_KINDS }) kind!: WithdrawalKind;
  @ApiProperty({ example: '4.000', description: 'Quantidade total retirada, positiva.' }) quantity!: string;
  @ApiProperty({ type: () => [MovementDto], description: 'Um lançamento por lote usado, na ordem de saída (FEFO).' }) movements!: MovementDto[];
  @ApiProperty({ example: '8.000', description: 'Saldo utilizável do insumo depois da retirada (sem lotes vencidos).' }) usableBalance!: string;
  @ApiProperty({
    type: [String],
    description: 'Avisos da retirada (`LOT_NOT_NEAREST_EXPIRY`, `QUANTITY_ABOVE_DAILY_AVERAGE`). Preenchido na E4-H2; hoje vem vazio.',
  })
  warnings!: string[];
}
