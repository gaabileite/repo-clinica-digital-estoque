import { Decimal, dec, type Quantity } from './decimal';

/** RN-10: múltiplo padrão da média diária a partir do qual a retirada é "muito acima da média". */
export const DEFAULT_HIGH_WITHDRAWAL_MULTIPLIER = 3;

/**
 * RN-10: o limite é o maior valor entre o múltiplo configurado da média diária de consumo e 1 unidade.
 * Sem histórico de consumo (média zero) o limite é 1.
 */
export const highWithdrawalThreshold = (avgDailyConsumption: Quantity, multiplier: Quantity = DEFAULT_HIGH_WITHDRAWAL_MULTIPLIER): Decimal =>
  Decimal.max(dec(avgDailyConsumption).times(multiplier), 1);

/** RN-10: a quantidade supera o limite (igual ao limite não avisa). */
export const isHighWithdrawal = (quantity: Quantity, avgDailyConsumption: Quantity, multiplier: Quantity = DEFAULT_HIGH_WITHDRAWAL_MULTIPLIER): boolean =>
  dec(quantity).gt(highWithdrawalThreshold(avgDailyConsumption, multiplier));
