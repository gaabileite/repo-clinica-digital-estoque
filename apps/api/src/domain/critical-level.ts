export type StockSituation = 'adequate' | 'reorder' | 'critical' | 'out-of-stock';

export interface CriticalLevelInput {
  usableBalance: number;
  avgDailyConsumption: number;
  leadTimeDays: number;
  /** Margem de segurança em % (RF-04; padrão 20). */
  safetyMarginPercent: number;
}

/**
 * RN-01: nota de 0 (tranquilo) a 10 (muito crítico).
 * 10 sem saldo utilizável; 0 sem consumo; nos demais casos compara a cobertura com o tempo de
 * reposição acrescido da margem. Cobertura igual à meta dá 7; 3 vezes a meta ou mais dá 0.
 */
export function criticalLevel(input: CriticalLevelInput): number {
  const { usableBalance, avgDailyConsumption, leadTimeDays, safetyMarginPercent } = input;
  if (usableBalance <= 0) return 10;
  if (!(avgDailyConsumption > 0)) return 0;
  const target = Math.max(0.5, leadTimeDays) * (1 + safetyMarginPercent / 100);
  const ratio = usableBalance / avgDailyConsumption / target;
  return Math.max(0, Math.min(10, Math.round(10 * (1 - ratio / 3))));
}

/** Situação mostrada ao usuário: 7 ou mais é crítico, 5 e 6 pedem reposição em breve. */
export function stockSituation(level: number, usableBalance: number): StockSituation {
  if (usableBalance <= 0) return 'out-of-stock';
  if (level >= 7) return 'critical';
  if (level >= 5) return 'reorder';
  return 'adequate';
}
