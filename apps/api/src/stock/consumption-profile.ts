import { Decimal, dec, toQuantityString, type Quantity } from '../domain';

/** RN-11: a média aprendida usa os dias 15 a 90 antes de hoje; a recente, os últimos 14 dias. */
export const LEARNED_WINDOW = { fromDaysAgo: 90, toDaysAgo: 15 } as const;
export const RECENT_DAYS = 14;
export const LEARNED_SPAN_DAYS = LEARNED_WINDOW.fromDaysAgo - LEARNED_WINDOW.toDaysAgo;
/** RN-11: média aprendida mínima, por dia, para a queda valer. */
export const MIN_LEARNED_AVERAGE = new Decimal('0.15');
export const DEFAULT_CONSUMPTION_DROP_PERCENT = 50;

export interface ConsumptionProfileInput {
  /** Consumo líquido (consumo menos devoluções, sem estornados) dos últimos 30 dias. */
  netLast30Days: Quantity;
  /** Consumo líquido entre 90 e 15 dias atrás. */
  netLearnedWindow: Quantity;
  /** Consumo líquido dos últimos 14 dias. */
  netLast14Days: Quantity;
  /** Queda, em %, que dispara o alerta (parâmetro `consumptionDropPercent`; padrão 50). */
  dropThresholdPercent: number;
}

export interface ConsumptionProfile {
  /** RN-02: média diária dos últimos 30 dias, líquida de devoluções. */
  avgDailyLast30Days: string;
  /** RN-11: média diária aprendida nos dias 15 a 90. */
  learnedAvgDaily: string;
  /** Média diária dos últimos 14 dias. */
  avgDailyLast14Days: string;
  /** Queda da média recente em relação à aprendida, em %; nulo sem média aprendida. */
  dropPercent: number | null;
  dropThresholdPercent: number;
  /** Queda igual ou maior que o limite com média aprendida de pelo menos 0,15 por dia. */
  dropDetected: boolean;
}

const nonNegative = (v: Quantity): Decimal => (dec(v).isNegative() ? new Decimal(0) : dec(v));

/** E-15 e RN-11. Pura: as somas vêm do livro de movimentações. */
export function computeConsumptionProfile(input: ConsumptionProfileInput): ConsumptionProfile {
  const avg30 = nonNegative(input.netLast30Days).div(30);
  const learned = nonNegative(input.netLearnedWindow).div(LEARNED_SPAN_DAYS);
  const recent = nonNegative(input.netLast14Days).div(RECENT_DAYS);

  const drop = learned.gt(0) ? learned.minus(recent).div(learned).times(100) : null;
  const dropPercent = drop === null ? null : drop.toDecimalPlaces(1, Decimal.ROUND_HALF_CEIL).toNumber();
  const dropDetected = drop !== null && learned.gte(MIN_LEARNED_AVERAGE) && drop.gte(input.dropThresholdPercent);

  return {
    avgDailyLast30Days: toQuantityString(avg30),
    learnedAvgDaily: toQuantityString(learned),
    avgDailyLast14Days: toQuantityString(recent),
    dropPercent,
    dropThresholdPercent: input.dropThresholdPercent,
    dropDetected,
  };
}
