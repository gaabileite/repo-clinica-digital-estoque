import { ApiProperty } from '@nestjs/swagger';

export class CatalogItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INS-0001' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() categoryId!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
  @ApiProperty() tracksLotAndExpiry!: boolean;
  @ApiProperty() expiryAlertLeadDays!: number;
  @ApiProperty() recordsTemperature!: boolean;
  @ApiProperty({ type: String, nullable: true }) temperatureRange!: string | null;
  @ApiProperty() estimatedLeadTimeDays!: number;
  @ApiProperty() active!: boolean;
  @ApiProperty({ description: 'Versão usada no ETag.' }) version!: number;
}

export class ItemPageMetaDto {
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
  @ApiProperty() total!: number;
}

export class CatalogItemPageDto {
  @ApiProperty({ type: () => [CatalogItemDto] }) data!: CatalogItemDto[];
  @ApiProperty({ type: () => ItemPageMetaDto }) page!: ItemPageMetaDto;
}
