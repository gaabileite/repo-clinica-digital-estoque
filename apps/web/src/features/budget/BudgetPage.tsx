import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Visão orçamentária (RF-42 a RF-45). Perfis: budget-controller, superuser (com a chave ligada).
 * Valor em estoque, perdas e consumo em reais.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function BudgetPage() {
  return (
    <>
      <PageHeader title="Visão orçamentária" />
      <EmptyState title="Em construção" description="Valor em estoque, perdas e consumo em reais." />
    </>
  );
}
