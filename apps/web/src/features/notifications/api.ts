import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

export interface InboxNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

/** A caixa de entrada pertence à plataforma de Notificações (D-14 e D-15). */
export interface NotificationInbox {
  list: () => Promise<InboxNotification[]>;
  setRead: (id: string, read: boolean) => Promise<void>;
  demonstration?: true;
}

export const NotificationInboxContext = createContext<NotificationInbox | undefined>(undefined);
const inboxKey = ['stock', 'notification-inbox'] as const;

export function useNotificationInbox() {
  const inbox = useContext(NotificationInboxContext);
  const query = useQuery({
    queryKey: inboxKey,
    queryFn: inbox ? () => inbox.list() : skipToken,
    retry: false,
  });

  return { inbox, query };
}

export function useSetNotificationRead(inbox: NotificationInbox) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      await inbox.setRead(id, read);
    },
    onSuccess: (_result, { id, read }) => {
      client.setQueryData<InboxNotification[]>(inboxKey, (items) =>
        items?.map((item) => item.id === id ? { ...item, read } : item),
      );
    },
  });
}
