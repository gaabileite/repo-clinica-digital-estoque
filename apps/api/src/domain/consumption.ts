import { Decimal, dec, ZERO, type Quantity } from './decimal';

/** RN-02: consumo médio diário = consumo líquido (consumo menos devoluções) dos últimos 30 dias ÷ 30. */
export const averageDailyConsumption = (netConsumptionLast30Days: Quantity): Decimal => {
  const net = dec(netConsumptionLast30Days);
  return net.isNegative() ? ZERO : net.div(30);
};

/** RN-02: cobertura em dias = saldo utilizável ÷ consumo médio diário (nulo quando não há consumo). */
export const coverageDays = (usableBalance: Quantity, avgDaily: Quantity): Decimal | null => {
  const avg = dec(avgDaily);
  return avg.gt(0) ? dec(usableBalance).div(avg) : null;
};
