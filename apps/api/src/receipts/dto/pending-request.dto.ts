import { ApiProperty } from '@nestjs/swagger';

/** Catalog data of the item a request asks for, when the item exists in this clinic. */
export class PendingRequestItemInfoDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'INS-0001' }) code!: string;
  @ApiProperty({ example: 'Luva de procedimento M (cx 100)' }) name!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
}

export class PendingRequestItemDto {
  @ApiProperty({ description: 'Id do insumo, como o módulo de Solicitações o conhece (decisão D3).' })
  itemId!: string;

  @ApiProperty({ example: '20.000', description: 'Quantidade pedida (decimal em string).' })
  quantity!: string;

  @ApiProperty({
    type: () => PendingRequestItemInfoDto,
    nullable: true,
    description: 'Dados do insumo nesta clínica; nulo quando o id não é de um insumo desta clínica.',
  })
  item!: PendingRequestItemInfoDto | null;
}

/** An open supply request that can be imported into a receipt (E-32, requirement RF-21). */
export class PendingRequestDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'REQ-0001' }) number!: string;
  @ApiProperty({ example: '2026-10-28', description: 'Data civil do pedido, usada como data do pedido na entrada (RN-03).' })
  requestedOn!: string;

  @ApiProperty({ type: () => [PendingRequestItemDto] }) items!: PendingRequestItemDto[];
}