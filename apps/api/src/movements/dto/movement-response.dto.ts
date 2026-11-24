import { ApiProperty } from '@nestjs/swagger';
import { MOVEMENT_KINDS, type MovementKindName } from '../movement-kinds';

export class MovementItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INS-0001' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
  @ApiProperty({ description: 'Categoria do insumo.' }) categoryName!: string;
}

export class MovementLotDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'LV-210', description: 'Lote como estava na movimentação (RNF-14).' }) lotCode!: string;
  @ApiProperty({ type: String, nullable: true, example: '2027-06-02', description: 'Validade na movimentação, data civil.' }) expiresOn!: string | null;
}

export class MovementDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Instante da movimentação, ISO 8601 UTC.' }) occurredAt!: string;
  @ApiProperty({ enum: MOVEMENT_KINDS, description: 'Uma das nove categorias do livro (RF-14).' }) kind!: MovementKindName;
  @ApiProperty({ type: () => MovementItemDto }) item!: MovementItemDto;
  @ApiProperty({ type: () => MovementLotDto, nullable: true }) lot!: MovementLotDto | null;
  @ApiProperty({ example: '-2.000', description: 'Positivo entra no estoque, negativo sai. Decimal em string.' }) quantity!: string;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Destinatário de empréstimo ou doação.' }) recipient!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Quem devolveu (devolução).' }) returnedBy!: string | null;
  @ApiProperty() userId!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Nome do usuário, do cache do IAM.' }) userName!: string | null;
  @ApiProperty({ type: String, nullable: true, example: 'manual' }) origin!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Movimentação que este estorno desfaz.' }) reversalOfId!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Estorno que desfez esta movimentação.' }) reversedById!: string | null;
}

export class MovementPageMetaDto {
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
  @ApiProperty({ description: 'Movimentações que atendem aos filtros.' }) total!: number;
}

export class MovementPageDto {
  @ApiProperty({ type: () => [MovementDto] }) data!: MovementDto[];
  @ApiProperty({ type: () => MovementPageMetaDto }) page!: MovementPageMetaDto;
}
