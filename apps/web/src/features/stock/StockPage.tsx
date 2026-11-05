import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Estoque (RF-19). Perfis: superuser, admin, warehouse.
 * Lista de estoque com filtros, lotes e situação.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function StockPage() {
  return (
    <>
      <PageHeader title="Estoque" />
      <EmptyState title="Em construção" description="Lista de estoque com filtros, lotes e situação." />
    </>
  );
}
