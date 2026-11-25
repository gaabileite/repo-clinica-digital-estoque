import { Bell } from 'lucide-react';
import { useNotificationInbox } from './api';

export function NotificationBell({ current, onOpen }: { current: boolean; onOpen: () => void }) {
  const { query } = useNotificationInbox();
  const unread = query.data?.filter((item) => !item.read).length;

  const label = unread === undefined
    ? 'Notificações'
    : 'Notificações: ' + unread + (unread === 1 ? ' não lida' : ' não lidas');

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      className="relative flex min-h-11 shrink-0 items-center gap-2 self-start rounded-lg border border-line bg-surface px-3 py-2 text-heading hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
    >
      <Bell size={20} aria-hidden="true" />
      {!!unread && (
        <span aria-hidden="true" className="rounded-full bg-brand-subtle px-2 text-xs font-semibold text-brand-text">
          {unread}
        </span>
      )}
    </button>
  );
}
