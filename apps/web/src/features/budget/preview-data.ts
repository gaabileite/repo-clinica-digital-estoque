import { createContext } from 'react';

interface Valuation {
  code: string;
  name: string;
  category: string;
  unitCostCents: number | null;
  valueCents: number;
  expiringCents: number;
  expiredCents: number;
}

export interface BudgetPreviewData {
  stockCents: number;
  expiringCents: number;
  expiredCents: number;
  lossCents: number;
  consumptionCents: number;
  items: Valuation[];
}

export const BudgetPreviewContext = createContext<BudgetPreviewData | null>(null);
