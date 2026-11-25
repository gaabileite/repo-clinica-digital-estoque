import { ApiProperty } from '@nestjs/swagger';

/** Result of an inventory adjustment (E-26). Quantities are decimal strings with three places. */
export class AdjustmentDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Id da movimentação gerada; nulo quando a contagem era igual ao saldo e nada mudou.',
  })
  movementId!: string | null;

  @ApiProperty() lotId!: string;
  @ApiProperty() itemId!: string;
  @ApiProperty({ example: '10.000', description: 'Saldo do lote antes do ajuste.' }) previousQuantity!: string;
  @ApiProperty({ example: '8.000', description: 'Quantidade contada, que passa a ser o saldo do lote.' }) countedQuantity!: string;
  @ApiProperty({ example: '-2.000', description: 'Contado menos o saldo anterior (negativo = faltava no sistema).' }) difference!: string;
}