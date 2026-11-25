import { highWithdrawalThreshold, isHighWithdrawal, toQuantityString, type Quantity } from '../domain';

export const WITHDRAWAL_WARNING_CODES = ['LOT_NOT_NEAREST_EXPIRY', 'QUANTITY_ABOVE_DAILY_AVERAGE'] as const;
export type WithdrawalWarningCode = (typeof WITHDRAWAL_WARNING_CODES)[number];

export interface WithdrawalWarning {
  code: WithdrawalWarningCode;
  /** Texto pronto para a tela mostrar antes de o usuário confirmar. */
  message: string;
  details: Record<string, string | null>;
}

interface LotRef {
  lotCode: string;
  expiresOn: string | null;
}

export interface WarningInput {
  quantity: Quantity;
  unit: string;
  /** RN-09: o lote escolhido não é o de validade mais próxima. */
  notNearest: boolean;
  chosenLot: LotRef | null;
  suggestedLot: LotRef | null;
  /** RN-10: média diária de consumo dos últimos 30 dias, líquida de devoluções. */
  avgDailyConsumption: Quantity;
  highWithdrawalMultiplier: Quantity;
}

const expiry = (lot: LotRef) => lot.expiresOn ?? 'sem validade';

/** RN-09 e RN-10: os avisos de uma retirada, na ordem em que a tela os mostra. Pura. */
export function buildWithdrawalWarnings(input: WarningInput): WithdrawalWarning[] {
  const warnings: WithdrawalWarning[] = [];

  if (input.notNearest && input.chosenLot && input.suggestedLot) {
    warnings.push({
      code: 'LOT_NOT_NEAREST_EXPIRY',
      message: `O lote ${input.chosenLot.lotCode} (validade ${expiry(input.chosenLot)}) não é o de validade mais próxima. O lote ${input.suggestedLot.lotCode} (validade ${expiry(input.suggestedLot)}) deveria sair primeiro.`,
      details: {
        chosenLotCode: input.chosenLot.lotCode,
        chosenLotExpiresOn: input.chosenLot.expiresOn,
        suggestedLotCode: input.suggestedLot.lotCode,
        suggestedLotExpiresOn: input.suggestedLot.expiresOn,
      },
    });
  }

  if (isHighWithdrawal(input.quantity, input.avgDailyConsumption, input.highWithdrawalMultiplier)) {
    const threshold = highWithdrawalThreshold(input.avgDailyConsumption, input.highWithdrawalMultiplier);
    warnings.push({
      code: 'QUANTITY_ABOVE_DAILY_AVERAGE',
      message: `A retirada de ${toQuantityString(input.quantity)} ${input.unit} está muito acima da média diária de consumo (${toQuantityString(input.avgDailyConsumption)} ${input.unit} por dia; limite de ${toQuantityString(threshold)}).`,
      details: {
        quantity: toQuantityString(input.quantity),
        avgDailyConsumption: toQuantityString(input.avgDailyConsumption),
        threshold: toQuantityString(threshold),
        multiplier: String(input.highWithdrawalMultiplier),
      },
    });
  }
  return warnings;
}

/** Alerta ao Administrador (P-05 `kind`) que cada aviso gera quando a retirada é confirmada. */
export const ALERT_KIND_BY_WARNING = {
  LOT_NOT_NEAREST_EXPIRY: { kind: 'LOT_NOT_NEAREST', event: 'lot-not-nearest', title: 'Retirada fora da validade mais próxima' },
  QUANTITY_ABOVE_DAILY_AVERAGE: { kind: 'HIGH_WITHDRAWAL', event: 'high-withdrawal', title: 'Retirada acima da média' },
} as const;
