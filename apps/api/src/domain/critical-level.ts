import { Decimal, dec, type Quantity } from './decimal';

export type StockSituation = 'adequate' | 'reorder' | 'critical' | 'out-of-stock';

export interface CriticalLevelInput {
  usableBalance: Quantity;
  avgDailyConsumption: Quantity;
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
  const { leadTimeDays, safetyMarginPercent } = input;
  const usableBalance = dec(input.usableBalance);
  const avgDailyConsumption = dec(input.avgDailyConsumption);
  if (usableBalance.lte(0)) return 10;
  if (!avgDailyConsumption.gt(0)) return 0;
  const target = dec(Math.max(0.5, leadTimeDays)).times(dec(safetyMarginPercent).div(100).plus(1));
  const ratio = usableBalance.div(avgDailyConsumption).div(target);
  // Arredonda para o inteiro mais próximo, metades para cima (igual ao Math.round do protótipo).
  const level = dec(10).times(dec(1).minus(ratio.div(3))).toDecimalPlaces(0, Decimal.ROUND_HALF_CEIL).toNumber();
  return Math.max(0, Math.min(10, level));
}

/** Situação mostrada ao usuário: 7 ou mais é crítico, 5 e 6 pedem reposição em breve. */
export function stockSituation(level: number, usableBalance: Quantity): StockSituation {
  if (dec(usableBalance).lte(0)) return 'out-of-stock';
  if (level >= 7) return 'critical';
  if (level >= 5) return 'reorder';
  return 'adequate';
}
