export const movementLabels = {
  consumption: 'Consumo',
  'expiry-loss': 'Perda por validade',
  'damage-discard': 'Descarte por avaria',
  loan: 'Empréstimo',
  donation: 'Doação',
  entry: 'Entrada',
  reversal: 'Estorno',
  'inventory-adjustment': 'Ajuste de inventário',
  return: 'Devolução',
} as const;

export type MovementKind = keyof typeof movementLabels;

// Resposta E-39 publicada no PR #17. Tipos locais até o cliente ser regenerado após o merge.
export interface Movement {
  id: string;
  occurredAt: string;
  kind: MovementKind;
  item: { id: string; code: string; name: string; unit: string; categoryName: string };
  lot: { id: string; lotCode: string; expiresOn: string | null } | null;
  quantity: string;
  reason: string | null;
  recipient: string | null;
  returnedBy: string | null;
  userId: string;
  userName: string | null;
  origin: string | null;
  reversalOfId: string | null;
  reversedById: string | null;
}

export interface MovementPage {
  data: Movement[];
  page: { nextCursor: string | null; total: number };
}

export interface MovementFilters {
  code: string;
  kind: string;
  userId: string;
  lot: string;
  from: string;
  to: string;
}

export const emptyMovementFilters: MovementFilters = {
  code: '', kind: '', userId: '', lot: '', from: '', to: '',
};

export function movementQuery(filters: MovementFilters, cursor?: string): string {
  const query = new URLSearchParams({ limit: '50' });
  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) query.set(key, value.trim());
  }
  if (cursor) query.set('cursor', cursor);
  return query.toString();
}

/** Conserva as três casas da quantidade, sem cálculos em ponto flutuante. */
export function formatQuantity(value: string, signed = false): string {
  const match = /^(-?)(\d+)(?:\.(\d{1,3}))?$/.exec(value);
  if (!match) return '—';
  const [, negative, integer, fraction = ''] = match;
  const zero = /^0+$/.test(integer + fraction);
  const sign = zero ? '' : negative ? '−' : signed ? '+' : '';
  return `${sign}${BigInt(integer).toLocaleString('pt-BR')},${fraction.padEnd(3, '0')}`;
}

export function formatCivilDate(value: string | null): string {
  if (!value) return 'Sem validade';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Data indisponível';
}

export function formatMovementTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR', {
    timeZone: 'America/Recife', dateStyle: 'short', timeStyle: 'short',
  });
}

export function normalizeCount(value: string): string | null {
  const text = value.trim().replace(',', '.');
  if (!/^\d{1,11}(\.\d{1,3})?$/.test(text)) return null;
  const [integer, fraction = ''] = text.split('.');
  return `${BigInt(integer)}.${fraction.padEnd(3, '0')}`;
}
