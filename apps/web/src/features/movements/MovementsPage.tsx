import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Movimentações (RF-14, RF-16, RF-17). Perfis: todos.
 * Livro de movimentações, estorno e ajuste de inventário.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function MovementsPage() {
  return (
    <>
      <PageHeader title="Movimentações" />
      <EmptyState title="Em construção" description="Livro de movimentações, estorno e ajuste de inventário." />
    </>
  );
}
