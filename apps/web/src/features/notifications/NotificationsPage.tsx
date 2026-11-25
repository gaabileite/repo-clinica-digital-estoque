import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { useNotificationInbox, useSetNotificationRead, type InboxNotification, type NotificationInbox } from './api';

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Recife',
});

export function NotificationsPage() {
  const { inbox, query } = useNotificationInbox();

  return (
    <>
      <PageHeader title="Notificações" />
      {!inbox ? (
        <EmptyState title="Caixa de entrada indisponível" description="A conexão com o serviço de Notificações da plataforma ainda não está disponível." />
      ) : (
        <>
          {inbox.demonstration && <p className="mb-4 text-sm text-muted">Dados de demonstração. As mudanças valem até recarregar a página.</p>}
          {query.isPending && <LoadingState message="Carregando notificações..." />}
          {query.isError && (
            <ErrorState
              title="Não foi possível consultar as notificações"
              message="Tente novamente em instantes."
              onRetry={() => void query.refetch()}
            />
          )}
          {query.data && <NotificationList inbox={inbox} items={query.data} />}
        </>
      )}
    </>
  );
}

function NotificationList({ inbox, items }: { inbox: NotificationInbox; items: InboxNotification[] }) {
  const mark = useSetNotificationRead(inbox);
  const unread = items.filter((item) => !item.read).length;

  if (!items.length) return <EmptyState title="Nenhuma notificação" />;

  return (
    <>
      <p role="status" className="mb-3 text-sm text-muted">Não lidas: {unread}</p>
      {mark.isError && (
        <p role="alert" className="mb-3 text-sm text-danger-text">Não foi possível alterar a notificação. Tente novamente.</p>
      )}
      <ul aria-label="Alertas de estoque" className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-line bg-surface p-4">
            <article className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-heading">{item.title}</h2>
                <p className="mt-1 text-sm text-body">{item.message}</p>
                <p className="mt-2 text-xs text-muted">
                  <time dateTime={item.createdAt}>{dateTime.format(new Date(item.createdAt))}</time>
                  {' · '}{item.read ? 'Lida' : 'Não lida'}
                </p>
              </div>
              <button
                type="button"
                aria-label={(item.read ? 'Marcar como não lida: ' : 'Marcar como lida: ') + item.title}
                aria-disabled={mark.isPending || undefined}
                onClick={() => {
                  if (!mark.isPending) mark.mutate({ id: item.id, read: !item.read });
                }}
                className="min-h-11 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-heading hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              >
                {item.read ? 'Marcar como não lida' : 'Marcar como lida'}
              </button>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
