import { EmptyState, PageHeader } from '@/components/ui';

/**
 * Notificações (RF-26 a RF-32). Perfis: superuser, admin, warehouse.
 * Mostra a caixa de entrada e as preferências do módulo de Notificações da plataforma (decisão D2: o Estoque só
 * produz os alertas). Os dados vêm de um adaptador, simulado até a plataforma oferecer a API.
 * Referência visual: prototype/ (protótipo validado). Regras: docs/requirements.md.
 */
export function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notificações" />
      <EmptyState title="Em construção" description="Caixa de entrada e preferências de alertas, vindas da plataforma." />
    </>
  );
}
