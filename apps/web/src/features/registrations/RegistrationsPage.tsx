import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Cadastros (RF-05 a RF-08, RF-43). Perfis: admin, superuser, budget-controller (custo).
 * Insumos, categorias, pacotes e custo unitário.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function RegistrationsPage() {
  return (
    <>
      <PageHeader title="Cadastros" />
      <EmptyState title="Em construção" description="Insumos, categorias, pacotes e custo unitário." />
    </>
  );
}
