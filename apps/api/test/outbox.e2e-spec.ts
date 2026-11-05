import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EventPublisher } from '../src/events/event-publisher.service';
import type { EventTransport } from '../src/events/event-transport';
import type { CloudEvent } from '../src/events/event-types';
import { MAX_ATTEMPTS, OutboxDispatcher, backoffMs } from '../src/events/outbox-dispatcher.service';
import { PrismaOutboxRepository } from '../src/events/outbox.repository';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Integração com o PostgreSQL de verdade. Só roda com TEST_DATABASE_URL (banco com as migrations aplicadas;
 * as tabelas outbox_events e dead_letter_events são limpas a cada teste, então use um banco de teste).
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('outbox no banco real', () => {
  let prisma: PrismaService;
  let publisher: EventPublisher;
  let dispatcher: OutboxDispatcher;
  const sent: CloudEvent[] = [];
  let failing = false;
  const transport: EventTransport = {
    async send(event) {
      if (failing) throw new Error('fora do ar');
      sent.push(event);
    },
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    prisma = new PrismaService();
    await prisma.$connect();
    publisher = new EventPublisher(prisma);
    dispatcher = new OutboxDispatcher(new PrismaOutboxRepository(prisma), transport);
  });
  afterAll(() => prisma.$disconnect());
  beforeEach(async () => {
    sent.length = 0;
    failing = false;
    await prisma.deadLetterEvent.deleteMany();
    await prisma.outboxEvent.deleteMany();
  });

  it('grava o evento e o despachante o envia uma vez', async () => {
    const id = await publisher.publish('stock.movement.recorded', 'c1:i1', { quantity: '-2.000' });
    const row = await prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ attempts: 0, publishedAt: null, deadAt: null });

    expect(await dispatcher.dispatchPending()).toEqual({ sent: 1, failed: 0, dead: 0 });
    expect(sent[0]).toMatchObject({ id, type: 'stock.movement.recorded', subject: 'c1:i1', data: { quantity: '-2.000' } });
    expect((await prisma.outboxEvent.findUniqueOrThrow({ where: { id } })).publishedAt).not.toBeNull();
    expect((await dispatcher.dispatchPending()).sent).toBe(0);
  });

  it('o evento some junto com a transação que falhou (padrão outbox)', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await publisher.publish('stock.movement.recorded', 'c1:i1', {}, { tx });
        throw new Error('movimentação recusada');
      }),
    ).rejects.toThrow('movimentação recusada');
    expect(await prisma.outboxEvent.count()).toBe(0);
  });

  it('falha agenda nova tentativa e, ao esgotar, vai para a fila de descarte', async () => {
    const id = await publisher.publish('stock.alert.raised', 'c1:i1', { kind: 'critical-level' });
    failing = true;
    // O banco arredonda `nextAttemptAt` para o milissegundo; folga para o relógio do teste não cair antes dele.
    let now = new Date(Date.now() + 100);
    for (let n = 1; n < MAX_ATTEMPTS; n += 1) {
      expect((await dispatcher.dispatchPending(now)).failed).toBe(1);
      const row = await prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
      expect(row.attempts).toBe(n);
      expect(row.lastError).toBe('fora do ar');
      now = new Date(now.getTime() + backoffMs(n) + 1);
    }
    expect((await dispatcher.dispatchPending(now)).dead).toBe(1);
    const dead = await prisma.deadLetterEvent.findMany();
    expect(dead).toHaveLength(1);
    expect(dead[0]).toMatchObject({ eventId: id, type: 'stock.alert.raised', attempts: MAX_ATTEMPTS, error: 'fora do ar' });
    expect((await prisma.outboxEvent.findUniqueOrThrow({ where: { id } })).deadAt).not.toBeNull();
    expect((await dispatcher.dispatchPending(now)).sent).toBe(0);
  });

  it('a retenção apaga da fila de descarte só o que passou de 7 dias', async () => {
    await prisma.deadLetterEvent.createMany({
      data: [
        { eventId: 'a', type: 't', payload: {}, error: 'e', attempts: 5, createdAt: new Date(Date.now() - 8 * 864e5) },
        { eventId: 'b', type: 't', payload: {}, error: 'e', attempts: 5, createdAt: new Date() },
      ],
    });
    expect(await new PrismaOutboxRepository(prisma).purgeDeadLetters(new Date(Date.now() - 7 * 864e5))).toBe(1);
    expect((await prisma.deadLetterEvent.findMany()).map((d) => d.eventId)).toEqual(['b']);
  });
});
