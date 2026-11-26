import type { BudgetPreviewData } from './preview-data';

export const demoBudget: BudgetPreviewData = {
  stockCents: 250500,
  expiringCents: 25500,
  expiredCents: 8500,
  lossCents: 3250,
  consumptionCents: 41850,
  items: [
    { code: 'INS-0001', name: 'Luvas de procedimento', category: 'EPI', unitCostCents: 1200, valueCents: 120000, expiringCents: 20000, expiredCents: 0 },
    { code: 'INS-0002', name: 'Atadura', category: 'Curativos', unitCostCents: 850, valueCents: 85000, expiringCents: 0, expiredCents: 8500 },
    { code: 'INS-0003', name: 'Gaze estéril', category: 'Curativos', unitCostCents: 550, valueCents: 45500, expiringCents: 5500, expiredCents: 0 },
    { code: 'INS-0004', name: 'Protetor facial', category: 'EPI', unitCostCents: null, valueCents: 0, expiringCents: 0, expiredCents: 0 },
  ],
};
