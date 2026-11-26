import { createContext } from 'react';

export interface ReportItem {
  code: string;
  name: string;
  category: string;
  unit: string;
}

export interface ReportMovement {
  id: string;
  date: string;
  clinic: string;
  item: ReportItem;
  kind: 'consumption' | 'return' | 'expiry-loss' | 'damage-discard';
  quantity: number;
  lot?: string;
}

export const ReportsPreviewContext = createContext<ReportMovement[] | null>(null);
