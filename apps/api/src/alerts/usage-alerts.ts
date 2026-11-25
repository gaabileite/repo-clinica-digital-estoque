import type { AlertKind, Prisma } from '@prisma/client';
import type { EventPublisher } from '../events/event-publisher.service';

export interface UsageAlert {
  clinicId: string;
  itemId: string;
  kind: Extract<AlertKind, 'LOT_NOT_NEAREST' | 'HIGH_WITHDRAWAL'>;
  /** Nome do `kind` no evento P-05. */
  eventKind: 'lot-not-nearest' | 'high-withdrawal';
  title: string;
  body: string;
  details: Record<string, unknown>;
}

/**
 * RF-28 (RN-09, RN-10): alerta de uso ao Administrador da clínica, dentro da transação da movimentação.
 * Cada ocorrência vira um evento `stock.alert.raised` (P-05) para a Notificações; no banco fica um alerta aberto
 * por insumo e tipo (índice `alerts_open_unique`), que mostra a ocorrência mais recente.
 */
export async function raiseUsageAlert(tx: Prisma.TransactionClient, events: EventPublisher, alert: UsageAlert): Promise<string> {
  const open = await tx.alert.findFirst({
    where: { clinicId: alert.clinicId, itemId: alert.itemId, kind: alert.kind, clearedAt: null },
    select: { id: true },
  });
  const data = { title: alert.title, body: alert.body, profiles: ['ADMIN' as const], raisedAt: new Date() };
  const saved = open
    ? await tx.alert.update({ where: { id: open.id }, data, select: { id: true } })
    : await tx.alert.create({ data: { clinicId: alert.clinicId, itemId: alert.itemId, kind: alert.kind, ...data }, select: { id: true } });

  await events.publish(
    'stock.alert.raised',
    `${alert.clinicId}:${alert.itemId}`,
    {
      alertId: saved.id,
      clinicId: alert.clinicId,
      itemId: alert.itemId,
      kind: alert.eventKind,
      profiles: ['admin'],
      title: alert.title,
      body: alert.body,
      ...alert.details,
    },
    { clinicId: alert.clinicId, tx },
  );
  return saved.id;
}
