import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Saídas (RF-09 a RF-12, RF-15). Perfis: admin, warehouse.
 * Retirada com FEFO e baixa de pacote de insumos.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function WithdrawalsPage() {
  return (
    <>
      <PageHeader title="Saídas" />
      <EmptyState title="Em construção" description="Retirada com FEFO e baixa de pacote de insumos." />
    </>
  );
}
