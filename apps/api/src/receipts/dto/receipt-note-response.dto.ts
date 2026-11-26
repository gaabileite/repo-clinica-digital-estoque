import { ApiProperty } from '@nestjs/swagger';
import { RECEIPT_ORIGINS, type ReceiptOrigin } from './create-receipt.dto';

export class ReceiptNoteSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'NR-0001' }) number!: string;
  @ApiProperty({ enum: RECEIPT_ORIGINS }) origin!: ReceiptOrigin;
  @ApiProperty({ example: '2026-11-25', description: 'Data de recebimento, AAAA-MM-DD.' }) receivedOn!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Instante do estorno (ISO 8601 UTC); nulo se a nota está vigente.' }) reversedAt!: string | null;
  @ApiProperty({ example: 3 }) lineCount!: number;
  @ApiProperty({ description: 'Alguma linha tem quantidade pedida diferente da recebida.' }) hasDivergence!: boolean;
}

export class ReceiptNotePageMetaDto {
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
  @ApiProperty({ description: 'Notas que atendem aos filtros.' }) total!: number;
}

export class ReceiptNotePageDto {
  @ApiProperty({ type: () => [ReceiptNoteSummaryDto] }) data!: ReceiptNoteSummaryDto[];
  @ApiProperty({ type: () => ReceiptNotePageMetaDto }) page!: ReceiptNotePageMetaDto;
}

export class ReceiptNoteItemDto {
  @ApiProperty({ example: 'INS-0001' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
}

export class ReceiptNoteLineDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: () => ReceiptNoteItemDto }) item!: ReceiptNoteItemDto;
  @ApiProperty({ type: String, nullable: true, example: '12.000' }) orderedQuantity!: string | null;
  @ApiProperty({ example: '10.000' }) receivedQuantity!: string;
  @ApiProperty({ type: String, nullable: true, example: 'LV-210' }) lotCode!: string | null;
  @ApiProperty({ type: String, nullable: true, example: '2027-06-02' }) expiresOn!: string | null;
}

export class ReceiptNoteDetailDto extends ReceiptNoteSummaryDto {
  @ApiProperty({ type: String, nullable: true, example: '2026-11-10' }) orderedOn!: string | null;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, nullable: true }) donorLetterFileId!: string | null;
  @ApiProperty({ type: String, nullable: true }) proofFileId!: string | null;
  @ApiProperty({ type: String, nullable: true }) reversalReason!: string | null;
  @ApiProperty({ type: () => [ReceiptNoteLineDto] }) lines!: ReceiptNoteLineDto[];
}
