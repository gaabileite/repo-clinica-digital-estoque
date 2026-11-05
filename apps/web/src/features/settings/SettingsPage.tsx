import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Configurações (RF-03, RF-04). Perfis: superuser.
 * Permissões por perfil e parâmetros de cálculo e de alerta.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" />
      <EmptyState title="Em construção" description="Permissões por perfil e parâmetros de cálculo e de alerta." />
    </>
  );
}
