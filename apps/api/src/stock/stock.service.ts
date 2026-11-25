import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { notImplemented } from '../common/not-implemented';
import { netConsumption, numberSetting } from './consumption-query';
import { computeAvailability } from './availability';
import { computeConsumptionProfile, DEFAULT_CONSUMPTION_DROP_PERCENT, LEARNED_WINDOW, RECENT_DAYS } from './consumption-profile';
import { averageDailyConsumption, DEFAULT_HIGH_WITHDRAWAL_MULTIPLIER, dec, toQuantityString, type LeadTimeSample } from '../domain';
import { buildWithdrawalWarnings } from '../withdrawals/withdrawal-warnings';
import { applyBalanceQuery } from './balance-list';
import { civilToday, civilToIso, dateColumnToCivil } from './civil-date';
import type { ListBalancesQueryDto } from './dto/list-balances-query.dto';
import type { AvailabilityDto, BalancePageDto, ConsumptionProfileDto, ItemBalanceDto, LotListDto } from './dto/stock-responses.dto';
import { classifyLots, computeBalance, type ItemBalance } from './stock-metrics';

const DAY_MS = 864e5;
const DEFAULT_SAFETY_MARGIN_PERCENT = 20;

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /** E-12 (E3-H1): balance per item with critical level, coverage and nearest expiry. */
  async balances(clinicId: string, query: ListBalancesQueryDto): Promise<BalancePageDto> {
    const rows = await this.clinicBalances(clinicId, query.active ?? 'true');
    const page = applyBalanceQuery(rows, query);
    return { data: page.data.map(toBalanceDto), page: page.page };
  }

  /** E-13 (E3-H2): lots with balance, in FEFO order, with status by the item's own alert lead time. */
  async lots(clinicId: string, itemId: string): Promise<LotListDto> {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, clinicId },
      include: { lots: { where: { quantity: { gt: 0 } }, select: { id: true, lotCode: true, expiresOn: true, quantity: true } } },
    });
    if (!item) throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Insumo não encontrado nesta clínica.' });

    const lots = classifyLots(
      item.lots.map((l) => ({ id: l.id, lotCode: l.lotCode, expiresOn: dateColumnToCivil(l.expiresOn), quantity: dec(l.quantity) })),
      item.expiryAlertLeadDays,
      civilToday(),
    );
    return {
      item: { id: item.id, code: item.code, name: item.name, unit: item.unit, expiryAlertLeadDays: item.expiryAlertLeadDays },
      data: lots.map((l) => ({
        id: l.id,
        lotCode: l.lotCode,
        expiresOn: l.expiresOn,
        quantity: toQuantityString(l.quantity),
        status: l.status,
        daysToExpiry: l.daysToExpiry,
        usable: l.usable,
        suggested: l.suggested,
      })),
    };
  }

  /**
   * Balances of every item of a clinic. Also used by the dashboard and the alert scan (later sprints).
   * One query per data source (items with lots, consumption, receipts, settings): no query per item.
   */
  async clinicBalances(clinicId: string, active: 'true' | 'false' | 'all' = 'true', now: Date = new Date()): Promise<ItemBalance[]> {
    const since = new Date(now.getTime() - 30 * DAY_MS);
    const [items, consumption, receiptLines, margin] = await Promise.all([
      this.prisma.item.findMany({
        where: { clinicId, ...(active === 'all' ? {} : { active: active === 'true' }) },
        include: {
          category: { select: { name: true } },
          lots: { where: { quantity: { gt: 0 } }, select: { id: true, lotCode: true, expiresOn: true, quantity: true } },
        },
      }),
      // RN-02: consumption minus returns; reversed consumption does not count (RN-07).
      this.prisma.movement.groupBy({
        by: ['itemId'],
        where: { clinicId, kind: { in: ['CONSUMPTION', 'RETURN'] }, occurredAt: { gte: since }, reversal: { is: null } },
        _sum: { quantity: true },
      }),
      // RN-03: only receipts that are not reversed and have an order date.
      this.prisma.receiptLine.findMany({
        where: { item: { clinicId }, receipt: { reversedAt: null, orderedOn: { not: null } } },
        select: { itemId: true, receipt: { select: { orderedOn: true, receivedOn: true } } },
      }),
      this.prisma.setting.findUnique({ where: { key: 'safetyMarginPercent' } }),
    ]);

    // The ledger stores consumption as negative and returns as positive, so net consumption is minus the sum.
    const netByItem = new Map(consumption.map((c) => [c.itemId, dec(c._sum.quantity ?? 0).negated()]));
    const samplesByItem = new Map<string, LeadTimeSample[]>();
    for (const line of receiptLines) {
      const list = samplesByItem.get(line.itemId) ?? [];
      list.push({ orderedOn: dateColumnToCivil(line.receipt.orderedOn) ?? undefined, receivedOn: dateColumnToCivil(line.receipt.receivedOn) as string });
      samplesByItem.set(line.itemId, list);
    }
    const safetyMarginPercent = typeof margin?.value === 'number' ? margin.value : DEFAULT_SAFETY_MARGIN_PERCENT;
    const today = civilToday(now);

    return items.map((item) =>
      computeBalance({
        item: {
          id: item.id,
          code: item.code,
          name: item.name,
          categoryId: item.categoryId,
          categoryName: item.category.name,
          unit: item.unit,
          tracksLotAndExpiry: item.tracksLotAndExpiry,
          recordsTemperature: item.recordsTemperature,
          active: item.active,
          expiryAlertLeadDays: item.expiryAlertLeadDays,
          estimatedLeadTimeDays: item.estimatedLeadTimeDays,
        },
        lots: item.lots.map((l) => ({ id: l.id, lotCode: l.lotCode, expiresOn: dateColumnToCivil(l.expiresOn), quantity: dec(l.quantity) })),
        netConsumptionLast30Days: netByItem.get(item.id) ?? dec(0),
        leadTimeSamples: samplesByItem.get(item.id) ?? [],
        safetyMarginPercent,
        today,
      }),
    );
  }

  /**
   * E-14: availability for consumption (no expired lots, RN-05) and the FEFO suggested lot (RN-04).
   * With `lotId` it previews the chosen lot; `warnings` are the ones the withdrawal would raise (RN-09, RN-10),
   * so the screen can show them before the user confirms.
   */
  async availability(clinicId: string, itemId: string, quantity: string, lotId?: string): Promise<AvailabilityDto> {
    const item = await this.findItem(clinicId, itemId, true);
    const today = civilToday();
    const lots = (item.lots ?? []).map((l) => ({ id: l.id, lotCode: l.lotCode, expiresOn: dateColumnToCivil(l.expiresOn), quantity: dec(l.quantity) }));
    if (lotId) {
      const chosen = lots.find((l) => l.id === lotId);
      if (!chosen) throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Lote não encontrado neste insumo, ou sem saldo.' });
      if (chosen.expiresOn !== null && chosen.expiresOn < civilToIso(today)) {
        throw new UnprocessableEntityException({ code: 'STOCK_LOT_EXPIRED', detail: `O lote ${chosen.lotCode} está vencido. Registre como perda por validade.` });
      }
    }
    const result = computeAvailability(lots, quantity, item.expiryAlertLeadDays, today, civilToIso(today), lotId);

    const now = new Date();
    const net30 = await netConsumption(this.prisma, clinicId, itemId, new Date(now.getTime() - 30 * DAY_MS), now);
    const warnings = buildWithdrawalWarnings({
      quantity,
      unit: item.unit,
      notNearest: result.notNearest,
      chosenLot: lots.find((l) => l.id === lotId) ?? null,
      suggestedLot: lots.find((l) => l.id === result.suggestedLot?.id) ?? null,
      avgDailyConsumption: averageDailyConsumption(net30),
      highWithdrawalMultiplier: await numberSetting(this.prisma, 'highWithdrawalMultiplier', DEFAULT_HIGH_WITHDRAWAL_MULTIPLIER),
    });
    return { ...result, warnings };
  }

  /** E-15: 30-day average, learned average (days 15 to 90) and last-14-day average with the drop indicator (RN-11). */
  async consumptionProfile(clinicId: string, itemId: string, now: Date = new Date()): Promise<ConsumptionProfileDto> {
    await this.findItem(clinicId, itemId);
    const ago = (days: number) => new Date(now.getTime() - days * DAY_MS);
    const net = (from: Date, to: Date) => netConsumption(this.prisma, clinicId, itemId, from, to);
    const [last30, learned, last14, dropThreshold] = await Promise.all([
      net(ago(30), now),
      net(ago(LEARNED_WINDOW.fromDaysAgo), ago(LEARNED_WINDOW.toDaysAgo)),
      net(ago(RECENT_DAYS), now),
      numberSetting(this.prisma, 'consumptionDropPercent', DEFAULT_CONSUMPTION_DROP_PERCENT),
    ]);
    return computeConsumptionProfile({
      netLast30Days: last30,
      netLearnedWindow: learned,
      netLast14Days: last14,
      dropThresholdPercent: dropThreshold,
    });
  }

  private async findItem(clinicId: string, itemId: string, withLots = false) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, clinicId },
      include: withLots ? { lots: { where: { quantity: { gt: 0 } }, select: { id: true, lotCode: true, expiresOn: true, quantity: true } } } : undefined,
    });
    if (!item) throw new NotFoundException({ code: 'NOT_FOUND', detail: 'Insumo não encontrado nesta clínica.' });
    return item as typeof item & { lots?: { id: string; lotCode: string; expiresOn: Date | null; quantity: Prisma.Decimal }[] };
  }
  leadTime(_clinicId: string, _itemId: string): Promise<never> {
    return notImplemented('E-33', 'Tempo de reposição medido ou estimado');
  }
}

export function toBalanceDto(b: ItemBalance): ItemBalanceDto {
  return {
    itemId: b.item.id,
    code: b.item.code,
    name: b.item.name,
    categoryId: b.item.categoryId,
    categoryName: b.item.categoryName,
    unit: b.item.unit,
    tracksLotAndExpiry: b.item.tracksLotAndExpiry,
    recordsTemperature: b.item.recordsTemperature,
    active: b.item.active,
    balance: toQuantityString(b.balance),
    usableBalance: toQuantityString(b.usableBalance),
    expiredQuantity: toQuantityString(b.expiredQuantity),
    expiredLots: b.expiredLots,
    expiringLots: b.expiringLots,
    nearestExpiry: b.nearestExpiry,
    avgDailyConsumption: toQuantityString(b.avgDailyConsumption),
    coverageDays: b.coverageDays,
    leadTimeDays: b.leadTimeDays,
    leadTimeSource: b.leadTimeSource,
    criticalLevel: b.criticalLevel,
    situation: b.situation,
    expiryAlertLeadDays: b.item.expiryAlertLeadDays,
  };
}
