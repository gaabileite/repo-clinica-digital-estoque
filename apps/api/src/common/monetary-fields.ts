/**
 * Names that look like money. Monetary values may only leave the API through the budget routes,
 * and only for who has the budget scope (RN-15, RNF-05).
 */
const MONETARY_PATTERNS = [
  /cost|price|valuation|monetary|currency|reais|brl|worth|amount/i,
  /[a-z]Value$/, // stockValue, lostValue, totalValue...
  /^value[A-Z]/, // valueInStock...
];

export const isMonetaryName = (name: string): boolean => MONETARY_PATTERNS.some((pattern) => pattern.test(name));

/** Paths (like `$.data[0].unitCost`) of every key in the JSON whose name looks like money. */
export function findMonetaryKeys(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) return value.flatMap((entry, index) => findMonetaryKeys(entry, `${path}[${index}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
      ...(isMonetaryName(key) ? [`${path}.${key}`] : []),
      ...findMonetaryKeys(child, `${path}.${key}`),
    ]);
  }
  return [];
}