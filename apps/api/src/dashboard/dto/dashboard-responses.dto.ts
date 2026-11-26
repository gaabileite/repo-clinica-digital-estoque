import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty({ example: 7, description: 'Insumos ativos da clínica. Os indicadores contam itens, não lotes (RF-37).' })
  controlledItems!: number;

  @ApiProperty({ example: 2, description: 'Insumos em nível crítico (nota 7 a 10) ou sem estoque utilizável (RN-01).' })
  criticalItems!: number;

  @ApiProperty({ example: 3, description: 'Insumos com pelo menos um lote a vencer.' })
  expiringItems!: number;

  @ApiProperty({ example: 1, description: 'Insumos com pelo menos um lote vencido.' })
  itemsWithExpiredLots!: number;
}

export class DashboardCriticalItemDto {
  @ApiProperty() itemId!: string;
  @ApiProperty({ example: 'INS-0004' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
  @ApiProperty({ example: '3.000', description: 'Saldo utilizável, sem lotes vencidos (RN-05).' }) usableBalance!: string;
  @ApiProperty({ minimum: 0, maximum: 10, example: 9, description: 'Nível crítico de 0 a 10 (RN-01).' }) criticalLevel!: number;
  @ApiProperty({ type: Number, nullable: true, example: 2.3, description: 'Dias de cobertura; nulo sem consumo.' })
  coverageDays!: number | null;
  @ApiProperty({ enum: ['critical', 'out-of-stock'] }) situation!: 'critical' | 'out-of-stock';
}

export class DashboardLotDto {
  @ApiProperty() itemId!: string;
  @ApiProperty({ example: 'INS-0004' }) itemCode!: string;
  @ApiProperty() itemName!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
  @ApiProperty() lotId!: string;
  @ApiProperty({ example: 'AL-702' }) lotCode!: string;
  @ApiProperty({ example: '2026-12-12', description: 'Data civil (fuso America/Recife).' }) expiresOn!: string;
  @ApiProperty({ example: 18, description: 'Dias até a validade; negativo se vencido.' }) daysToExpiry!: number;
  @ApiProperty({ example: '9.000' }) quantity!: string;
  @ApiProperty({ enum: ['expiring', 'expired'], description: 'Sempre mostrar com cor e rótulo (RN-08).' })
  status!: 'expiring' | 'expired';
}

export class DashboardMovementDto {
  @ApiProperty() id!: string;
  @ApiProperty() itemId!: string;
  @ApiProperty({ example: 'INS-0001' }) itemCode!: string;
  @ApiProperty() itemName!: string;
  @ApiProperty({ example: 'consumption', description: 'Categoria da movimentação, no formato do contrato (E-39).' }) kind!: string;
  @ApiProperty({ example: '-2.000', description: 'Positivo entra no estoque, negativo sai.' }) quantity!: string;
  @ApiProperty({ type: String, nullable: true, example: 'LV-210' }) lotCode!: string | null;
  @ApiProperty() userId!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Nome do usuário, quando está no cache do IAM.' }) userName!: string | null;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
}

/** Answer of GET /clinics/{clinicId}/dashboard (E-16, requirement RF-37). No monetary values (RN-15). */
export class DashboardDto {
  @ApiProperty({ type: () => DashboardSummaryDto }) summary!: DashboardSummaryDto;

  @ApiProperty({ type: () => [DashboardCriticalItemDto], description: 'Até 20 itens, do mais crítico ao menos crítico.' })
  criticalItems!: DashboardCriticalItemDto[];

  @ApiProperty({ type: () => [DashboardLotDto], description: 'Até 20 lotes a vencer, os que vencem primeiro no topo.' })
  expiringLots!: DashboardLotDto[];

  @ApiProperty({ type: () => [DashboardLotDto], description: 'Até 20 lotes vencidos, os mais atrasados no topo.' })
  expiredLots!: DashboardLotDto[];

  @ApiPropertyOptional({
    type: () => [DashboardMovementDto],
    description: 'Últimas 10 movimentações. Só vem para Administrador e Superuser; para o Almoxarife a chave não existe.',
  })
  recentMovements?: DashboardMovementDto[];
}

export class WeeklyConsumptionItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INS-0001' }) code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'cx' }) unit!: string;
}

export class WeeklyConsumptionWeekDto {
  @ApiProperty({ example: '2026-11-23', description: 'Segunda-feira da semana (data civil).' }) weekStart!: string;
  @ApiProperty({ example: '3.500', description: 'Consumo líquido de devoluções; nunca negativo (RN-02).' }) quantity!: string;
}

/** Answer of GET /clinics/{clinicId}/dashboard/weekly-consumption (E-17). */
export class WeeklyConsumptionDto {
  @ApiProperty({ type: () => WeeklyConsumptionItemDto }) item!: WeeklyConsumptionItemDto;

  @ApiProperty({
    type: () => [WeeklyConsumptionWeekDto],
    description: 'Da semana mais antiga para a atual. A última semana ainda está em andamento.',
  })
  weeks!: WeeklyConsumptionWeekDto[];
}