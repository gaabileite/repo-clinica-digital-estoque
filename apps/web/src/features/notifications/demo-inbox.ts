import type { InboxNotification, NotificationInbox } from './api';

/** Demonstração isolada, com alertas fictícios e estado em memória. */
export function createDemoInbox(): NotificationInbox {
  const timestamp = Date.now();
  let rows: InboxNotification[] = [
    {
      id: 'demo-critical',
      title: 'Estoque em nível crítico',
      message: 'O saldo de luvas de procedimento está abaixo do nível de reposição.',
      createdAt: new Date(timestamp - 60 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'demo-expiry',
      title: 'Lote próximo da validade',
      message: 'Confira a validade dos lotes de gaze na tela de Estoque.',
      createdAt: new Date(timestamp - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'demo-usage',
      title: 'Consumo abaixo da média',
      message: 'O consumo recente de máscaras ficou abaixo da média da clínica.',
      createdAt: new Date(timestamp - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
  ];

  return {
    demonstration: true,
    list: async () => rows.map((row) => ({ ...row })),
    setRead: async (id, read) => {
      rows = rows.map((row) => row.id === id ? { ...row, read } : row);
    },
  };
}
