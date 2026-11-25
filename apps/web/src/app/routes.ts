import type { ComponentType } from 'react';
import { BudgetPage } from '@/features/budget';
import { DashboardPage } from '@/features/dashboard';
import { MovementsPage } from '@/features/movements';
import { NotificationsPage } from '@/features/notifications';
import { ReceiptsPage } from '@/features/receipts';
import { RegistrationsPage } from '@/features/registrations';
import { ReportsPage } from '@/features/reports';
import { ReturnsPage } from '@/features/returns';
import { SettingsPage } from '@/features/settings';
import { StockPage } from '@/features/stock';
import { WithdrawalsPage } from '@/features/withdrawals';
import type { Permission } from './permissions';

export interface PageDef {
  /** Segmento da URL: /supplies/<id>. Vazio é o Painel (/supplies). */
  id: string;
  label: string;
  component: ComponentType;
  /** Escopo exigido ou lista de escopos aceitos. Sem escopo, todos veem. */
  permission?: Permission | readonly Permission[];
  /** Aparece na barra do módulo. */
  inNav: boolean;
}

export const PAGES: PageDef[] = [
  { id: '', label: 'Painel', component: DashboardPage, inNav: true },
  { id: 'stock', label: 'Estoque', component: StockPage, permission: 'stock:read', inNav: true },
  { id: 'withdrawals', label: 'Saídas', component: WithdrawalsPage, permission: 'stock:withdraw', inNav: true },
  { id: 'returns', label: 'Devolução', component: ReturnsPage, permission: 'stock:withdraw', inNav: true },
  { id: 'receipts', label: 'Entradas', component: ReceiptsPage, permission: ['stock:read', 'stock:receive'], inNav: true },
  { id: 'movements', label: 'Movimentações', component: MovementsPage, permission: 'stock:read', inNav: true },
  { id: 'reports', label: 'Relatórios', component: ReportsPage, permission: 'stock:reports', inNav: true },
  { id: 'registrations', label: 'Cadastros', component: RegistrationsPage, permission: ['stock:admin', 'stock:catalog:write', 'stock:budget:cost:write'], inNav: true },
  { id: 'settings', label: 'Configurações', component: SettingsPage, permission: 'stock:admin', inNav: true },
  { id: 'budget', label: 'Visão orçamentária', component: BudgetPage, permission: 'stock:budget:read', inNav: true },
  { id: 'notifications', label: 'Notificações', component: NotificationsPage, permission: 'stock:read', inNav: false },
];

export const pageById = (id: string): PageDef => PAGES.find((p) => p.id === id) ?? PAGES[0];
