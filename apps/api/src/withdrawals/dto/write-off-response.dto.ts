import { ApiProperty } from '@nestjs/swagger';

export class WrittenOffLotDto {
  @ApiProperty() lotId!: string;
  @ApiProperty({ example: 'AN-551' }) lotCode!: string;
  @ApiProperty({ example: '2026-11-20', description: 'Validade do lote (data civil).' }) expiresOn!: string;
  @ApiProperty() itemId!: string;
  @ApiProperty({ example: 'INS-0005' }) itemCode!: string;
  @ApiProperty() itemName!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
  @ApiProperty({ example: '2.000', description: 'Quantidade baixada (era o saldo do lote), positiva.' }) quantity!: string;
  @ApiProperty({ description: 'Id da movimentação EXPIRY_LOSS gerada.' }) movementId!: string;
}

/** Result of E-23: one entry per lot written off. */
export class WriteOffDto {
  @ApiProperty({ example: 1, description: 'Quantos lotes foram baixados (0 quando não havia lote vencido).' }) count!: number;
  @ApiProperty({ type: () => [WrittenOffLotDto] }) lots!: WrittenOffLotDto[];
}