import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Entradas (RF-18, RF-22 a RF-25). Perfis: admin, warehouse, budget-controller (só notas).
 * Nova entrada, notas de recebimento e recebimentos incorretos.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function ReceiptsPage() {
  return (
    <>
      <PageHeader title="Entradas" />
      <EmptyState title="Em construção" description="Nova entrada, notas de recebimento e recebimentos incorretos." />
    </>
  );
}
