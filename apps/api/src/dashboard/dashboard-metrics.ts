import {
  daysUntil,
  dec,
  sumQuantities,
  toQuantityString,
  validityStatus,
  ZERO,
  type Quantity,
  type StockSituation,
} from '../domain';
import { CLINIC_TIME_ZONE } from '../stock/civil-date';
import type {
  DashboardCriticalItemDto,
  DashboardDto,
  DashboardLotDto,
  DashboardMovementDto,
  WeeklyConsumptionWeekDto,
} from './dto/dashboard-responses.dto';

/** Each list of the dashboard shows at most this many rows; the summary counts everything. */
export const LIST_LIMIT = 20;
const DAY_MS = 864e5;

export interface DashboardBalanceInput {
  item: { id: string; code: string; name: string; unit: string };
  usableBalance: Quantity;
  criticalLevel: number;
  coverageDays: number | null;
  situation: StockSituation;
  expiredLots: number;
  expiringLots: number;
}

export interface DashboardLotInput {
  lotId: string;
  lotCode: string;
  /** Civil date `YYYY-MM-DD`; null when the item does not track expiry. */
  expiresOn: string | null;
  quantity: Quantity;
  item: { id: string; code: string; name: string; unit: string; expiryAlertLeadDays: number };
}

export interface DashboardMovementInput {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  /** Database enum value, e.g. EXPIRY_LOSS. */
  kind: string;
  quantity: Quantity;
  lotCode: string | null;
  userId: string;
  userName: string | null;
  occurredAt: Date;
}

export interface DashboardInput {
  balances: DashboardBalanceInput[];
  lots: DashboardLotInput[];
  /** Today's civil date (see `civilToday`). */
  today: Date;
  /** Leave undefined for profiles that must not see the recent movements. */
  movements?: DashboardMovementInput[];
}

const byName = (a: string, b: string) => a.localeCompare(b, 'pt-BR');

/** EXPIRY_LOSS becomes expiry-loss, the format of the contract (E-39). */
export const toApiKind = (kind: string): string => kind.toLowerCase().replace(/_/g, '-');

/** E-16: builds the dashboard from raw data. Pure: no database, no clock. */
export function buildDashboard(input: DashboardInput): DashboardDto {
  const { balances, lots, today, movements } = input;

  const critical = balances
    .filter((b) => b.situation === 'critical' || b.situation === 'out-of-stock')
    .sort((a, b) => b.criticalLevel - a.criticalLevel || byName(a.item.name, b.item.name));

  const flaggedLots: DashboardLotDto[] = lots.flatMap((lot) => {
    if (lot.expiresOn === null) return [];
    const status = validityStatus(lot.expiresOn, lot.item.expiryAlertLeadDays, today);
    if (status !== 'expiring' && status !== 'expired') return [];
    return [
      {
        itemId: lot.item.id,
        itemCode: lot.item.code,
        itemName: lot.item.name,
        unit: lot.item.unit,
        lotId: lot.lotId,
        lotCode: lot.lotCode,
        expiresOn: lot.expiresOn,
        daysToExpiry: daysUntil(lot.expiresOn, today),
        quantity: toQuantityString(lot.quantity),
        status,
      },
    ];
  });
  const earliestFirst = (a: DashboardLotDto, b: DashboardLotDto) =>
    a.daysToExpiry - b.daysToExpiry || byName(a.itemName, b.itemName);

  const criticalItems: DashboardCriticalItemDto[] = critical.slice(0, LIST_LIMIT).map((b) => ({
    itemId: b.item.id,
    code: b.item.code,
    name: b.item.name,
    unit: b.item.unit,
    usableBalance: toQuantityString(b.usableBalance),
    criticalLevel: b.criticalLevel,
    coverageDays: b.coverageDays,
    situation: b.situation as 'critical' | 'out-of-stock',
  }));

  const dashboard: DashboardDto = {
    summary: {
      controlledItems: balances.length,
      criticalItems: critical.length,
      expiringItems: balances.filter((b) => b.expiringLots > 0).length,
      itemsWithExpiredLots: balances.filter((b) => b.expiredLots > 0).length,
    },
    criticalItems,
    expiringLots: flaggedLots.filter((l) => l.status === 'expiring').sort(earliestFirst).slice(0, LIST_LIMIT),
    expiredLots: flaggedLots.filter((l) => l.status === 'expired').sort(earliestFirst).slice(0, LIST_LIMIT),
  };

  if (movements) {
    dashboard.recentMovements = movements.map(
      (m): DashboardMovementDto => ({
        id: m.id,
        itemId: m.itemId,
        itemCode: m.itemCode,
        itemName: m.itemName,
        kind: toApiKind(m.kind),
        quantity: toQuantityString(m.quantity),
        lotCode: m.lotCode,
        userId: m.userId,
        userName: m.userName,
        occurredAt: m.occurredAt.toISOString(),
      }),
    );
  }
  return dashboard;
}

// ---- E-17: weekly consumption ----

const parseIso = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (iso: string, days: number): string => toIso(new Date(parseIso(iso).getTime() + days * DAY_MS));

/** The Monday of the week that contains the civil date. */
export function weekStartOf(iso: string): string {
  const sinceMonday = (parseIso(iso).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(iso, -sinceMonday);
}

/** Monday of each of the last `weeks` weeks, oldest first. The last one is the current week. */
export function weeklyWindow(todayIso: string, weeks: number): string[] {
  const current = weekStartOf(todayIso);
  return Array.from({ length: weeks }, (_, index) => addDays(current, -7 * (weeks - 1 - index)));
}

/** The civil date (clinic time zone) of an instant, as `YYYY-MM-DD`. */
export function civilDateOf(instant: Date, timeZone: string = CLINIC_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

export interface WeeklyEntry {
  civilDate: string;
  /** Net consumption of the movement: consumption counts positive, a return counts negative. */
  quantity: Quantity;
}

/** Sums the entries per week. Weeks with no entry are zero, a negative total becomes zero, old entries are ignored. */
export function buildWeeklySeries(entries: WeeklyEntry[], todayIso: string, weeks: number): WeeklyConsumptionWeekDto[] {
  return weeklyWindow(todayIso, weeks).map((weekStart) => {
    const weekEnd = addDays(weekStart, 7); // exclusive
    const inWeek = entries.filter((e) => e.civilDate >= weekStart && e.civilDate < weekEnd);
    const total = sumQuantities(inWeek.map((e) => e.quantity));
    return { weekStart, quantity: toQuantityString(total.isNegative() ? ZERO : dec(total)) };
  });
}