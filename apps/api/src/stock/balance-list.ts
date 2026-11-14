import { BadRequestException } from '@nestjs/common';
import type { StockSituation } from '../domain';
import type { ItemBalance } from './stock-metrics';

export const BALANCE_SORT_FIELDS = ['name', 'code', 'balance', 'criticalLevel', 'coverageDays', 'nearestExpiry', 'situation'] as const;
export type BalanceSortField = (typeof BALANCE_SORT_FIELDS)[number];

export interface BalanceListQuery {
  q?: string;
  categoryId?: string;
  situation?: StockSituation;
  /** Has at least one expired lot / at least one expiring lot. */
  expiry?: 'expired' | 'expiring';
  /** Nearest usable expiry within this many days. */
  expiringWithinDays?: number;
  lotControl?: 'yes' | 'no';
  temperature?: 'yes' | 'no';
  /** `-field` sorts descending. Default: `-criticalLevel`. */
  sort?: string;
  limit?: number;
  cursor?: string;
}

export interface BalancePage<T> {
  data: T[];
  page: { nextCursor: string | null; total: number; totalInClinic: number };
}

const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

const SEVERITY: Record<StockSituation, number> = { 'out-of-stock': 3, critical: 2, reorder: 1, adequate: 0 };

/** Lowercase and without accents, so "Álcool" matches "alcool". */
export const normalizeText = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function parseSort(sort: string | undefined): { field: BalanceSortField; dir: 1 | -1 } {
  const raw = sort ?? '-criticalLevel';
  const desc = raw.startsWith('-');
  const field = (desc ? raw.slice(1) : raw) as BalanceSortField;
  if (!(BALANCE_SORT_FIELDS as readonly string[]).includes(field)) {
    throw new BadRequestException({ code: 'INVALID_SORT', detail: `Ordenação inválida: ${raw}.` });
  }
  return { field, dir: desc ? -1 : 1 };
}

export const encodeCursor = (offset: number): string => Buffer.from(JSON.stringify({ o: offset })).toString('base64url');

export function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const offset = (JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { o?: unknown }).o;
    if (typeof offset === 'number' && Number.isInteger(offset) && offset >= 0) return offset;
  } catch {
    /* falls through */
  }
  throw new BadRequestException({ code: 'INVALID_CURSOR', detail: 'Cursor de paginação inválido.' });
}

function matches(b: ItemBalance, q: BalanceListQuery): boolean {
  const { item } = b;
  if (q.q) {
    const needle = normalizeText(q.q);
    if (!normalizeText(item.name).includes(needle) && !normalizeText(item.code).includes(needle)) return false;
  }
  if (q.categoryId && item.categoryId !== q.categoryId) return false;
  if (q.situation && b.situation !== q.situation) return false;
  if (q.expiry === 'expired' && b.expiredLots === 0) return false;
  if (q.expiry === 'expiring' && b.expiringLots === 0) return false;
  if (q.expiringWithinDays !== undefined && !(b.nearestExpiry && b.nearestExpiry.daysToExpiry <= q.expiringWithinDays)) return false;
  if (q.lotControl && item.tracksLotAndExpiry !== (q.lotControl === 'yes')) return false;
  if (q.temperature && item.recordsTemperature !== (q.temperature === 'yes')) return false;
  return true;
}

function sortValue(b: ItemBalance, field: BalanceSortField): number | string | null {
  switch (field) {
    case 'name': return b.item.name;
    case 'code': return b.item.code;
    case 'balance': return b.balance;
    case 'criticalLevel': return b.criticalLevel;
    case 'coverageDays': return b.coverageDays;
    case 'nearestExpiry': return b.nearestExpiry ? b.nearestExpiry.expiresOn : null;
    case 'situation': return SEVERITY[b.situation] * 100 + b.criticalLevel;
  }
}

/** Filters, sorts and paginates the balances of one clinic. Nulls (no coverage, no expiry) always go last. */
export function applyBalanceQuery(rows: ItemBalance[], q: BalanceListQuery): BalancePage<ItemBalance> {
  const { field, dir } = parseSort(q.sort);
  const offset = decodeCursor(q.cursor);
  const limit = q.limit ?? 50;

  const filtered = rows.filter((r) => matches(r, q));
  filtered.sort((a, b) => {
    const va = sortValue(a, field);
    const vb = sortValue(b, field);
    if (va === null && vb !== null) return 1;
    if (vb === null && va !== null) return -1;
    if (va !== null && vb !== null) {
      // Text sorts with the pt-BR collation (accents and case ignored); numbers and ISO dates compare directly.
      const c = typeof va === 'string' && typeof vb === 'string' ? COLLATOR.compare(va, vb) : va === vb ? 0 : va < vb ? -1 : 1;
      if (c !== 0) return c * dir;
    }
    return COLLATOR.compare(a.item.name, b.item.name) || a.item.code.localeCompare(b.item.code);
  });

  const data = filtered.slice(offset, offset + limit);
  const next = offset + limit;
  return {
    data,
    page: { nextCursor: next < filtered.length ? encodeCursor(next) : null, total: filtered.length, totalInClinic: rows.length },
  };
}
