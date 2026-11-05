import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Painel (RF-37). Perfis: todos.
 * Itens controlados, em nível crítico, a vencer e vencidos; gráfico de consumo semanal.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function DashboardPage() {
  return (
    <>
      <PageHeader title="Painel" />
      <EmptyState title="Em construção" description="Itens controlados, em nível crítico, a vencer e vencidos; gráfico de consumo semanal." />
    </>
  );
}
