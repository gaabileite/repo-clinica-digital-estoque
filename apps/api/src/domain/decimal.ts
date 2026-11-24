import Decimal from 'decimal.js';

export { Decimal };

/** Quantidades do domínio: aceita Decimal, número ou string decimal ("12.500"). */
export type Quantity = Decimal.Value;

/**
 * Cópia isolada do Decimal para o domínio: arredonda para cima só em `toFixed`, sem notação científica,
 * e nunca perde precisão em somas e divisões de quantidades (14,3 no banco).
 */
export const dec = (value: Quantity): Decimal =>
  // Decimal do Prisma é outra cópia do decimal.js: converte pela string para não depender da representação interna.
  value instanceof Decimal || typeof value !== 'object' ? new Decimal(value) : new Decimal(String(value));

export const ZERO = new Decimal(0);

/** Soma exata de quantidades. */
export const sumQuantities = (values: Quantity[]): Decimal => values.reduce<Decimal>((acc, v) => acc.plus(v), ZERO);

/** String decimal da API (contrato, seção 2): três casas, ex.: "12.500". */
export const toQuantityString = (value: Quantity, places = 3): string => dec(value).toFixed(places);
