import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Relatórios (RF-38 a RF-41). Perfis: superuser, admin.
 * Consumo, perdas, curva ABC e exportação em PDF e Excel.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function ReportsPage() {
  return (
    <>
      <PageHeader title="Relatórios" />
      <EmptyState title="Em construção" description="Consumo, perdas, curva ABC e exportação em PDF e Excel." />
    </>
  );
}
