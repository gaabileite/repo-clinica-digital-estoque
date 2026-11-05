import { describe, expect, it } from 'vitest';
import type { EventTransport } from './event-transport';
import type { CloudEvent } from './event-types';
import { MAX_ATTEMPTS, OutboxDispatcher, backoffMs } from './outbox-dispatcher.service';
import type { OutboxRepository, OutboxRow } from './outbox.repository';

/** Outbox em memória, com a mesma semântica do repositório do Prisma. */
class MemoryOutbox implements OutboxRepository {
  rows: (OutboxRow & { publishedAt?: Date; deadAt?: Date; lastError?: string })[] = [];
  dead: { eventId: string; attempts: number; error: string }[] = [];
  private seq = 0;

  add(subject: string, now: Date, type = 'stock.movement.recorded'): OutboxRow {
    const row = { id: `e${++this.seq}`, type, subject, clinicId: null, payload: { n: this.seq }, createdAt: new Date(now.getTime() + this.seq), attempts: 0, nextAttemptAt: now };
    this.rows.push(row);
    return row;
  }
  async findPending(limit: number) {
    return this.rows.filter((r) => !r.publishedAt && !r.deadAt).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(0, limit);
  }
  async markPublished(id: string, at: Date) {
    this.find(id).publishedAt = at;
  }
  async markFailed(id: string, attempts: number, nextAttemptAt: Date, error: string) {
    Object.assign(this.find(id), { attempts, nextAttemptAt, lastError: error });
  }
  async moveToDeadLetter(row: OutboxRow, attempts: number, error: string, at: Date) {
    this.dead.push({ eventId: row.id, attempts, error });
    Object.assign(this.find(row.id), { attempts, lastError: error, deadAt: at });
  }
  async purgeDeadLetters() {
    return 0;
  }
  find(id: string) {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error(id);
    return row;
  }
}

class FakeTransport implements EventTransport {
  sent: CloudEvent[] = [];
  failFor = new Set<string>(); // ids que sempre falham
  async send(event: CloudEvent) {
    if (this.failFor.has(event.id)) throw new Error('barramento fora do ar');
    this.sent.push(event);
  }
}

const NOW = new Date('2026-11-05T12:00:00Z');
const setup = () => {
  const repo = new MemoryOutbox();
  const transport = new FakeTransport();
  return { repo, transport, dispatcher: new OutboxDispatcher(repo, transport) };
};

describe('despachante do outbox', () => {
  it('envia em ordem e marca como publicado', async () => {
    const { repo, transport, dispatcher } = setup();
    repo.add('c1:i1', NOW);
    repo.add('c1:i2', NOW);
    const result = await dispatcher.dispatchPending(NOW);
    expect(result).toEqual({ sent: 2, failed: 0, dead: 0 });
    expect(transport.sent.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(repo.rows.every((r) => r.publishedAt)).toBe(true);
  });

  it('monta o CloudEvent com id, tipo, subject e hora', async () => {
    const { repo, transport, dispatcher } = setup();
    repo.add('c1:i1', NOW, 'stock.alert.raised');
    await dispatcher.dispatchPending(NOW);
    expect(transport.sent[0]).toMatchObject({ id: 'e1', type: 'stock.alert.raised', source: '/stock/v1', subject: 'c1:i1' });
  });

  it('não reenvia o que já foi publicado', async () => {
    const { repo, transport, dispatcher } = setup();
    repo.add('c1:i1', NOW);
    await dispatcher.dispatchPending(NOW);
    await dispatcher.dispatchPending(NOW);
    expect(transport.sent).toHaveLength(1);
  });

  it('falha: conta a tentativa, agenda a próxima com espera crescente e guarda o erro', async () => {
    const { repo, transport, dispatcher } = setup();
    const row = repo.add('c1:i1', NOW);
    transport.failFor.add(row.id);
    const result = await dispatcher.dispatchPending(NOW);
    expect(result).toEqual({ sent: 0, failed: 1, dead: 0 });
    const stored = repo.find(row.id);
    expect(stored.attempts).toBe(1);
    expect(stored.lastError).toBe('barramento fora do ar');
    expect(stored.nextAttemptAt.getTime()).toBe(NOW.getTime() + backoffMs(1));
  });

  it('não tenta antes da hora e tenta depois dela', async () => {
    const { repo, transport, dispatcher } = setup();
    const row = repo.add('c1:i1', NOW);
    transport.failFor.add(row.id);
    await dispatcher.dispatchPending(NOW);
    transport.failFor.clear();
    expect((await dispatcher.dispatchPending(new Date(NOW.getTime() + 10_000))).sent).toBe(0);
    expect((await dispatcher.dispatchPending(new Date(NOW.getTime() + backoffMs(1) + 1))).sent).toBe(1);
  });

  it('ordem por subject: o evento seguinte espera o que falhou, mas outros subjects seguem', async () => {
    const { repo, transport, dispatcher } = setup();
    const a1 = repo.add('c1:i1', NOW);
    repo.add('c1:i1', NOW); // mesmo subject, depois do a1
    repo.add('c1:i2', NOW); // outro subject
    transport.failFor.add(a1.id);
    const result = await dispatcher.dispatchPending(NOW);
    expect(result).toEqual({ sent: 1, failed: 1, dead: 0 });
    expect(transport.sent.map((e) => e.subject)).toEqual(['c1:i2']);
  });

  it(`depois de ${MAX_ATTEMPTS} falhas vai para a fila de descarte e libera o subject`, async () => {
    const { repo, transport, dispatcher } = setup();
    const bad = repo.add('c1:i1', NOW);
    repo.add('c1:i1', NOW);
    transport.failFor.add(bad.id);
    let now = NOW;
    for (let n = 1; n < MAX_ATTEMPTS; n += 1) {
      expect((await dispatcher.dispatchPending(now)).failed).toBe(1);
      now = new Date(now.getTime() + backoffMs(n) + 1);
    }
    const last = await dispatcher.dispatchPending(now);
    expect(last.dead).toBe(1);
    expect(repo.dead).toEqual([{ eventId: bad.id, attempts: MAX_ATTEMPTS, error: 'barramento fora do ar' }]);
    expect(repo.find(bad.id).deadAt).toBeDefined();
    // o seguinte, do mesmo subject, sai na mesma varredura ou na próxima
    await dispatcher.dispatchPending(now);
    expect(transport.sent.map((e) => e.id)).toEqual(['e2']);
  });

  it('respeita o limite por varredura', async () => {
    const { repo, dispatcher } = setup();
    for (let n = 0; n < 5; n += 1) repo.add(`c1:i${n}`, NOW);
    expect((await dispatcher.dispatchPending(NOW, 3)).sent).toBe(3);
  });
});

describe('espera entre tentativas', () => {
  it('cresce e tem teto de 1 hora', () => {
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([30_000, 60_000, 120_000, 240_000]);
    expect(backoffMs(30)).toBe(3_600_000);
  });
});
