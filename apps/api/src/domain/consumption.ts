/** RN-02: consumo médio diário = consumo líquido (consumo menos devoluções) dos últimos 30 dias ÷ 30. */
export const averageDailyConsumption = (netConsumptionLast30Days: number): number =>
  Math.max(0, netConsumptionLast30Days) / 30;

/** RN-02: cobertura em dias = saldo utilizável ÷ consumo médio diário (nulo quando não há consumo). */
export const coverageDays = (usableBalance: number, avgDaily: number): number | null =>
  avgDaily > 0 ? usableBalance / avgDaily : null;
