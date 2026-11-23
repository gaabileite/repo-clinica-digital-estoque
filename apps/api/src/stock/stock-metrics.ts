import {
  Decimal,
  dec,
  sumQuantities,
  type Quantity,
  averageDailyConsumption,
  coverageDays,
  criticalLevel,
  daysUntil,
  fefoOrder,
  leadTime,
  stockSituation,
  validityStatus,
  type LeadTimeSample,
  type StockSituation,
  type ValidityStatus,
} from '../domain';

/** A lot without an expiry date (items that do not track expiry) has no validity status. */
export type LotStatus = ValidityStatus | 'no-expiry';

export interface LotInput {
  id: string;
  lotCode: string;
  /** Civil date `YYYY-MM-DD`, or null when the item does not track expiry. */
  expiresOn: string | null;
  quantity: Quantity;
}

export interface LotView extends Omit<LotInput, 'quantity'> {
  quantity: Decimal;
  status: LotStatus;
  /** Days until expiry (negative when already expired); null when there is no expiry date. */
  daysToExpiry: number | null;
  /** RN-05: an expired lot is not usable. */
  usable: boolean;
  /** First usable lot in FEFO order (RN-04). */
  suggested: boolean;
}

export interface ItemInfo {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  tracksLotAndExpiry: boolean;
  recordsTemperature: boolean;
  active: boolean;
  /** RF-08 / E2-H4: how many days before expiry a lot becomes "expiring". Per item. */
  expiryAlertLeadDays: number;
  estimatedLeadTimeDays: number;
}

export interface NearestExpiry {
  lotId: string;
  lotCode: string;
  expiresOn: string;
  daysToExpiry: number;
  status: LotStatus;
}

export interface ItemBalance {
  item: ItemInfo;
  balance: Decimal;
  usableBalance: Decimal;
  expiredQuantity: Decimal;
  expiredLots: number;
  expiringLots: number;
  nearestExpiry: NearestExpiry | null;
  avgDailyConsumption: Decimal;
  coverageDays: number | null;
  leadTimeDays: number;
  leadTimeSource: 'measured' | 'estimated';
  criticalLevel: number;
  situation: StockSituation;
}

/** Classifies the lots of one item: status by the item's own alert lead time, FEFO order, suggested lot. */
export function classifyLots(lots: LotInput[], alertLeadDays: number, today: Date): LotView[] {
  const ordered = lots.filter((l) => dec(l.quantity).gt(0)).sort(fefoOrder);
  let suggestedFound = false;
  return ordered.map((lot) => {
    const dated = lot.expiresOn !== null;
    const status: LotStatus = dated ? validityStatus(lot.expiresOn as string, alertLeadDays, today) : 'no-expiry';
    const usable = status !== 'expired';
    const suggested = usable && !suggestedFound;
    if (suggested) suggestedFound = true;
    return { ...lot, quantity: dec(lot.quantity), status, daysToExpiry: dated ? daysUntil(lot.expiresOn as string, today) : null, usable, suggested };
  });
}

export interface BalanceInput {
  item: ItemInfo;
  /** Lots of the item (zero-quantity lots are ignored). */
  lots: LotInput[];
  /** RN-02: consumption minus returns over the last 30 days, in the item's unit. */
  netConsumptionLast30Days: Quantity;
  /** RN-03: order and receipt dates of the item's non-reversed receipts. */
  leadTimeSamples: LeadTimeSample[];
  /** RF-04: safety margin in percent (default 20). */
  safetyMarginPercent: number;
  /** Today's civil date (see `civilToday`). */
  today: Date;
}

/** Builds the stock balance of one item from raw data. Pure: no database, no clock. */
export function computeBalance(input: BalanceInput): ItemBalance {
  const { item, today } = input;
  const lots = classifyLots(input.lots, item.expiryAlertLeadDays, today);

  const sum = (list: LotView[]) => sumQuantities(list.map((l) => l.quantity));
  const usableLots = lots.filter((l) => l.usable);
  const expired = lots.filter((l) => l.status === 'expired');
  const usableBalance = sum(usableLots);

  const avg = averageDailyConsumption(input.netConsumptionLast30Days);
  const lead = leadTime(input.leadTimeSamples, item.estimatedLeadTimeDays);
  const level = criticalLevel({
    usableBalance,
    avgDailyConsumption: avg,
    leadTimeDays: lead.days,
    safetyMarginPercent: input.safetyMarginPercent,
  });

  const nearest = usableLots.find((l) => l.expiresOn !== null);
  const coverage = coverageDays(usableBalance, avg);

  return {
    item,
    balance: sum(lots),
    usableBalance,
    expiredQuantity: sum(expired),
    expiredLots: expired.length,
    expiringLots: lots.filter((l) => l.status === 'expiring').length,
    nearestExpiry: nearest
      ? {
          lotId: nearest.id,
          lotCode: nearest.lotCode,
          expiresOn: nearest.expiresOn as string,
          daysToExpiry: nearest.daysToExpiry as number,
          status: nearest.status,
        }
      : null,
    avgDailyConsumption: avg,
    coverageDays: coverage === null ? null : coverage.toDecimalPlaces(2, Decimal.ROUND_HALF_CEIL).toNumber(),
    leadTimeDays: Math.round(lead.days * 100) / 100,
    leadTimeSource: lead.source,
    criticalLevel: level,
    situation: stockSituation(level, usableBalance),
  };
}
