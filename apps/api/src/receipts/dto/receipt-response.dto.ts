import { ApiProperty } from '@nestjs/swagger';
import { RECEIPT_ORIGINS, type ReceiptOrigin } from './create-receipt.dto';

export class ReceiptItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INS-0001' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
}

export class ReceiptLineResultDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: () => ReceiptItemDto }) item!: ReceiptItemDto;
  @ApiProperty({ example: '10.000' }) receivedQuantity!: string;
  @ApiProperty({ example: 'LV-210' }) lotCode!: string;
  @ApiProperty({ type: String, nullable: true, example: '2027-06-02' }) expiresOn!: string | null;
  @ApiProperty({ description: 'Lote que recebeu a quantidade (criado ou já existente).' }) lotId!: string;
  @ApiProperty({ description: 'Esta linha criou o lote.' }) lotCreated!: boolean;
  @ApiProperty({ description: 'Lançamento de entrada desta linha no livro de movimentações.' }) movementId!: string;
  @ApiProperty({ example: '25.000', description: 'Saldo total do insumo depois da entrada, com todos os lotes.' }) balance!: string;
}

export class ReceiptDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'NR-0001', description: 'Número da nota de recebimento, sequencial por clínica.' }) number!: string;
  @ApiProperty({ enum: RECEIPT_ORIGINS }) origin!: ReceiptOrigin;
  @ApiProperty({ type: String, nullable: true }) originClinicId!: string | null;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, nullable: true }) donorLetterFileId!: string | null;
  @ApiProperty({ type: String, nullable: true }) proofFileId!: string | null;
  @ApiProperty({ type: String, nullable: true, example: '2026-11-10', description: 'Data do pedido, usada no tempo de reposição (RN-03).' }) orderedOn!: string | null;
  @ApiProperty({ example: '2026-11-25' }) receivedOn!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ description: 'Instante da emissão, ISO 8601 UTC.' }) createdAt!: string;
  @ApiProperty({ type: () => [ReceiptLineResultDto] }) lines!: ReceiptLineResultDto[];
}
