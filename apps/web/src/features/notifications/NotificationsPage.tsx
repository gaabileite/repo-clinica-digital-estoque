import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Notificações (RF-26 a RF-32). Perfis: superuser, admin, warehouse.
 * Central de notificações e preferências.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notificações" />
      <EmptyState title="Em construção" description="Central de notificações e preferências." />
    </>
  );
}
