import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Devolução (RF-13). Perfis: admin, warehouse.
 * Devolução de item retirado e não utilizado.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function ReturnsPage() {
  return (
    <>
      <PageHeader title="Devolução" />
      <EmptyState title="Em construção" description="Devolução de item retirado e não utilizado." />
    </>
  );
}
