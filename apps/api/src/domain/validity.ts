export type ValidityStatus = 'valid' | 'expiring' | 'expired';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseCivilDate = (value: string | Date) => {
  if (value instanceof Date) return startOfDay(value);
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Dias até a validade (negativo se já passou). Data civil, sem hora. */
export function daysUntil(expiresOn: string | Date, today: Date): number {
  return Math.round((parseCivilDate(expiresOn).getTime() - startOfDay(today).getTime()) / 864e5);
}

/**
 * RN-08: vencido quando a validade já passou; a vencer quando faltam dias iguais ou menores
 * que a antecedência de alerta do insumo; válido nos demais casos.
 */
export function validityStatus(expiresOn: string | Date, alertLeadDays: number, today: Date): ValidityStatus {
  const days = daysUntil(expiresOn, today);
  if (days < 0) return 'expired';
  if (days <= alertLeadDays) return 'expiring';
  return 'valid';
}
