import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EVENT_TRANSPORT, type EventTransport } from './event-transport';
import type { CloudEvent } from './event-types';
import { OUTBOX_REPOSITORY, type OutboxRepository, type OutboxRow } from './outbox.repository';

/** Depois de 5 falhas o evento vai para a fila de descarte (decisão D6). */
export const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 3_600_000;
const DEAD_LETTER_RETENTION_MS = 7 * 864e5;
const PURGE_EVERY_MS = 3_600_000;

/** Espera crescente entre tentativas: 30 s, 1 min, 2 min, 4 min (limite de 1 h). */
export const backoffMs = (failedAttempts: number): number =>
  Math.min(BASE_DELAY_MS * 2 ** Math.max(0, failedAttempts - 1), MAX_DELAY_MS);

export interface DispatchResult {
  sent: number;
  failed: number;
  dead: number;
}

/**
 * Despachante do outbox: envia os eventos gravados na mesma transação da movimentação.
 *  - entrega "pelo menos uma vez": se o envio der certo e a marcação falhar, o evento sai de novo;
 *  - ordem por `subject` (clínica + insumo): se um evento falha, os seguintes do mesmo subject esperam;
 *  - depois de {@link MAX_ATTEMPTS} falhas, o evento vai para `dead_letter_events` e o subject é liberado.
 * Pensado para uma instância. Com várias, trocar a leitura por `FOR UPDATE SKIP LOCKED`.
 */
@Injectable()
export class OutboxDispatcher implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcher.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private lastPurge = 0;

  constructor(
    @Inject(OUTBOX_REPOSITORY) private readonly repository: OutboxRepository,
    @Inject(EVENT_TRANSPORT) private readonly transport: EventTransport,
  ) {}

  /** Liga a varredura periódica. Chamada pelo `main.ts`; os testes e a geração do contrato não a usam. */
  start(intervalMs: number): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
    this.logger.log(`Despachante do outbox ligado (a cada ${intervalMs} ms).`);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  onModuleDestroy(): void {
    this.stop();
  }

  private async tick(): Promise<void> {
    if (this.running) return; // não sobrepõe duas varreduras
    this.running = true;
    try {
      const now = new Date();
      const result = await this.dispatchPending(now);
      if (result.sent + result.failed + result.dead > 0) this.logger.log(`outbox: ${JSON.stringify(result)}`);
      if (now.getTime() - this.lastPurge > PURGE_EVERY_MS) {
        this.lastPurge = now.getTime();
        await this.repository.purgeDeadLetters(new Date(now.getTime() - DEAD_LETTER_RETENTION_MS));
      }
    } catch (error) {
      this.logger.error(`Falha na varredura do outbox: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  async dispatchPending(now: Date = new Date(), limit = 100): Promise<DispatchResult> {
    const result: DispatchResult = { sent: 0, failed: 0, dead: 0 };
    const blocked = new Set<string>();

    for (const row of await this.repository.findPending(limit)) {
      if (blocked.has(row.subject)) continue; // um evento anterior do mesmo subject ainda não saiu
      if (row.nextAttemptAt.getTime() > now.getTime()) {
        blocked.add(row.subject); // está esperando a próxima tentativa; os seguintes esperam junto
        continue;
      }
      try {
        await this.transport.send(toCloudEvent(row));
        await this.repository.markPublished(row.id, now);
        result.sent += 1;
      } catch (error) {
        const attempts = row.attempts + 1;
        const message = (error as Error).message ?? String(error);
        if (attempts >= MAX_ATTEMPTS) {
          await this.repository.moveToDeadLetter(row, attempts, message, now);
          result.dead += 1; // sai da fila: o subject é liberado
        } else {
          await this.repository.markFailed(row.id, attempts, new Date(now.getTime() + backoffMs(attempts)), message);
          blocked.add(row.subject);
          result.failed += 1;
        }
      }
    }
    return result;
  }
}

export function toCloudEvent(row: OutboxRow): CloudEvent {
  return {
    id: row.id,
    type: row.type,
    source: '/stock/v1',
    subject: row.subject,
    time: row.createdAt.toISOString(),
    ...(row.clinicId ? { clinicid: row.clinicId } : {}),
    data: row.payload,
  };
}
