import { ApiProperty } from '@nestjs/swagger';

const LOT_STATUS = ['valid', 'expiring', 'expired', 'no-expiry'] as const;
const SITUATIONS = ['adequate', 'reorder', 'critical', 'out-of-stock'] as const;

export class NearestExpiryDto {
  @ApiProperty() lotId!: string;
  @ApiProperty({ example: 'LV-210' }) lotCode!: string;
  @ApiProperty({ example: '2027-06-02', description: 'Data civil (fuso America/Recife).' }) expiresOn!: string;
  @ApiProperty({ example: 210, description: 'Dias até a validade.' }) daysToExpiry!: number;
  @ApiProperty({ enum: LOT_STATUS }) status!: (typeof LOT_STATUS)[number];
}

export class ItemBalanceDto {
  @ApiProperty() itemId!: string;
  @ApiProperty({ example: 'INS-0001' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() categoryId!: string;
  @ApiProperty() categoryName!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
  @ApiProperty() tracksLotAndExpiry!: boolean;
  @ApiProperty() recordsTemperature!: boolean;
  @ApiProperty() active!: boolean;
  @ApiProperty({ example: '3.000', description: 'Saldo total, com lotes vencidos. Decimal em string.' }) balance!: string;
  @ApiProperty({ example: '3.000', description: 'Saldo utilizável: sem lotes vencidos (RN-05).' }) usableBalance!: string;
  @ApiProperty({ example: '0.000' }) expiredQuantity!: string;
  @ApiProperty({ description: 'Número de lotes vencidos com saldo.' }) expiredLots!: number;
  @ApiProperty({ description: 'Número de lotes a vencer, dentro da antecedência do insumo.' }) expiringLots!: number;
  @ApiProperty({ type: () => NearestExpiryDto, nullable: true, description: 'Validade mais próxima entre os lotes utilizáveis.' })
  nearestExpiry!: NearestExpiryDto | null;
  @ApiProperty({ example: '0.567', description: 'Consumo médio diário, líquido de devoluções, dos últimos 30 dias (RN-02).' }) avgDailyConsumption!: string;
  @ApiProperty({ type: Number, nullable: true, example: 2.31, description: 'Dias de cobertura; nulo quando não há consumo.' }) coverageDays!: number | null;
  @ApiProperty({ example: 7, description: 'Tempo de reposição em dias (RN-03).' }) leadTimeDays!: number;
  @ApiProperty({ enum: ['measured', 'estimated'] }) leadTimeSource!: 'measured' | 'estimated';
  @ApiProperty({ minimum: 0, maximum: 10, example: 9, description: 'Nível crítico de 0 a 10 (RN-01).' }) criticalLevel!: number;
  @ApiProperty({ enum: SITUATIONS }) situation!: (typeof SITUATIONS)[number];
  @ApiProperty({ example: 30, description: 'Antecedência do alerta de validade deste insumo, em dias (RF-08).' }) expiryAlertLeadDays!: number;
}

export class BalancePageMetaDto {
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
  @ApiProperty({ description: 'Insumos que atendem aos filtros ("Exibindo N").' }) total!: number;
  @ApiProperty({ description: 'Insumos da clínica, antes dos filtros ("de M").' }) totalInClinic!: number;
}

export class BalancePageDto {
  @ApiProperty({ type: () => [ItemBalanceDto] }) data!: ItemBalanceDto[];
  @ApiProperty({ type: () => BalancePageMetaDto }) page!: BalancePageMetaDto;
}

export class LotDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'LV-210' }) lotCode!: string;
  @ApiProperty({ type: String, nullable: true, example: '2027-06-02' }) expiresOn!: string | null;
  @ApiProperty({ example: '3.000' }) quantity!: string;
  @ApiProperty({ enum: LOT_STATUS, description: 'Situação da validade (RN-08): sempre mostrar com cor e rótulo.' }) status!: (typeof LOT_STATUS)[number];
  @ApiProperty({ type: Number, nullable: true, description: 'Dias até a validade; negativo se vencido.' }) daysToExpiry!: number | null;
  @ApiProperty({ description: 'Lote vencido não é utilizável (RN-05).' }) usable!: boolean;
  @ApiProperty({ description: 'Primeiro lote utilizável na ordem FEFO (RN-04).' }) suggested!: boolean;
}

export class LotItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INS-0001' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
  @ApiProperty({ example: 30 }) expiryAlertLeadDays!: number;
}

export class LotListDto {
  @ApiProperty({ type: () => LotItemDto }) item!: LotItemDto;
  @ApiProperty({ type: () => [LotDto], description: 'Lotes com saldo, na ordem FEFO.' }) data!: LotDto[];
}

export class SuggestedLotDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'LV-210' }) lotCode!: string;
  @ApiProperty({ type: String, nullable: true, example: '2027-06-02' }) expiresOn!: string | null;
  @ApiProperty({ example: '3.000', description: 'Saldo do lote.' }) quantity!: string;
  @ApiProperty({ type: Number, nullable: true }) daysToExpiry!: number | null;
}

export class LotAllocationDto {
  @ApiProperty() lotId!: string;
  @ApiProperty({ example: 'LV-210' }) lotCode!: string;
  @ApiProperty({ example: '2.000' }) quantity!: string;
}

export class AvailabilityDto {
  @ApiProperty({ example: '2.500' }) requestedQuantity!: string;
  @ApiProperty({ example: '12.000', description: 'Saldo utilizável, sem lotes vencidos (RN-05).' }) usableBalance!: string;
  @ApiProperty({ example: '0.000', description: 'Quantidade em lotes vencidos, fora da disponibilidade.' }) expiredQuantity!: string;
  @ApiProperty({ description: 'O saldo utilizável cobre a quantidade pedida.' }) available!: boolean;
  @ApiProperty({ example: '0.000', description: 'Quanto falta para cobrir o pedido.' }) shortfall!: string;
  @ApiProperty({ type: () => SuggestedLotDto, nullable: true, description: 'Primeiro lote utilizável na ordem FEFO (RN-04).' })
  suggestedLot!: SuggestedLotDto | null;
  @ApiProperty({ type: () => [LotAllocationDto], description: 'Como a retirada sairia dos lotes; vazio sem saldo suficiente.' })
  allocations!: LotAllocationDto[];
}

export class ConsumptionProfileDto {
  @ApiProperty({ example: '0.567', description: 'Média diária dos últimos 30 dias, líquida de devoluções e estornos (RN-02).' }) avgDailyLast30Days!: string;
  @ApiProperty({ example: '0.800', description: 'Média diária aprendida nos dias 15 a 90 antes de hoje (RN-11).' }) learnedAvgDaily!: string;
  @ApiProperty({ example: '0.286', description: 'Média diária dos últimos 14 dias.' }) avgDailyLast14Days!: string;
  @ApiProperty({ type: Number, nullable: true, example: 64.3, description: 'Queda da média recente sobre a aprendida, em %; nulo sem média aprendida.' }) dropPercent!: number | null;
  @ApiProperty({ example: 50, description: 'Limite de queda configurado (`consumptionDropPercent`).' }) dropThresholdPercent!: number;
  @ApiProperty({ description: 'Indicador de queda: média aprendida de pelo menos 0,15 por dia e queda igual ou maior que o limite.' }) dropDetected!: boolean;
}
