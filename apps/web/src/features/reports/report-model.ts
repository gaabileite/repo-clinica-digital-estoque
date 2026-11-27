import type { ReportMovement } from './preview-data';

export type GroupBy = 'item' | 'clinic' | 'week';

const civilDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' });
const oneDay = 86_400_000;

export function reportStartDate(days: number): string {
  return civilDate.format(Date.now() - (days - 1) * oneDay);
}

function weekStart(value: string): string {
  const date = new Date(value + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}

export function consumptionRows(records: ReportMovement[], groupBy: GroupBy) {
  const totals = new Map<string, { label: string; unit: string; quantity: number }>();
  for (const record of records) {
    if (record.kind !== 'consumption' && record.kind !== 'return') continue;
    const { item, clinic, date } = record;
    const key = groupBy === 'week' ? weekStart(date) : groupBy === 'clinic' ? clinic : item.code;
    const label = groupBy === 'item' ? item.name : key;
    const current = totals.get(key)?.quantity ?? 0;
    const delta = record.kind === 'return' ? -record.quantity : record.quantity;
    totals.set(key, { label, unit: item.unit, quantity: current + delta });
  }
  const rows = [...totals.entries()]
    .map(([key, row]) => ({ key, ...row, quantity: Math.max(0, row.quantity) }))
    .filter((row) => row.quantity > 0);
  return rows.sort((a, b) => groupBy === 'week' ? a.label.localeCompare(b.label) : b.quantity - a.quantity);
}

export function abcRows(records: ReportMovement[]) {
  const rows = consumptionRows(records, 'item');
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.unit, (totals.get(row.unit) ?? 0) + row.quantity);
  const accumulate = new Map<string, number>();
  return rows.sort((a, b) => a.unit.localeCompare(b.unit, 'pt-BR')).map((row) => {
    const previous = accumulate.get(row.unit) ?? 0;
    const total = totals.get(row.unit) ?? row.quantity;
    const cumulative = previous + row.quantity;
    accumulate.set(row.unit, cumulative);
    const category = previous / total < 0.8 ? 'A' : previous / total < 0.95 ? 'B' : 'C';
    return { ...row, percentage: cumulative / total, category };
  });
}
