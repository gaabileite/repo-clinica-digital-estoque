import { ApiProperty } from '@nestjs/swagger';
import { INCORRECT_RECEIPT_STATUSES, type IncorrectReceiptApiStatus } from '../incorrect-receipt-rules';

/** An incorrect receipt as returned by E-34 to E-38. */
export class IncorrectReceiptDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Luva G no lugar da M' }) description!: string;
  @ApiProperty({ example: '10.000' }) quantity!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
  @ApiProperty({ example: 'Distribuidora Alfa' }) supplier!: string;
  @ApiProperty({ example: '2026-10-11', description: 'Data da notificação à empresa; início do prazo.' }) notifiedOn!: string;
  @ApiProperty({ type: String, nullable: true }) note!: string | null;

  @ApiProperty({
    enum: INCORRECT_RECEIPT_STATUSES,
    description: '"overdue" = aguardando, com o prazo completo: já pode incorporar ou descartar.',
  })
  status!: IncorrectReceiptApiStatus;

  @ApiProperty({ example: 14, description: 'Dias desde a notificação (até a resolução, quando já foi resolvido).' })
  daysSinceNotified!: number;

  @ApiProperty({ example: 45, description: 'Prazo configurado (parâmetro incorrectReceiptDeadlineDays).' })
  deadlineDays!: number;

  @ApiProperty({ type: Number, nullable: true, example: 31, description: 'Dias restantes; 0 se vencido; nulo se já resolvido.' })
  daysRemaining!: number | null;

  @ApiProperty({ type: String, nullable: true, example: '2026-11-20', description: 'Data da troca, da incorporação ou do descarte.' })
  resolvedOn!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Justificativa ou observação da decisão.' }) justification!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

/** Result of E-37: the record and the entry it generated. */
export class IncorporationDto {
  @ApiProperty({ type: () => IncorrectReceiptDto }) receipt!: IncorrectReceiptDto;
  @ApiProperty({ description: 'Id da movimentação ENTRY gerada.' }) movementId!: string;
  @ApiProperty() itemId!: string;
  @ApiProperty({ example: 'INS-0001' }) itemCode!: string;
  @ApiProperty() lotId!: string;
  @ApiProperty({ example: 'LV-999', description: '"-" para insumo sem controle de lote.' }) lotCode!: string;
  @ApiProperty({ example: '10.000', description: 'Quantidade que entrou no estoque.' }) quantity!: string;
}