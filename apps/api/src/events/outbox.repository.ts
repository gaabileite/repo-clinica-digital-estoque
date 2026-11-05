import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface OutboxRow {
  id: string;
  type: string;
  subject: string;
  clinicId: string | null;
  payload: unknown;
  createdAt: Date;
  attempts: number;
  nextAttemptAt: Date;
}

/** Acesso ao outbox. O despachante só conhece esta interface, o que permite testá-lo sem banco. */
export interface OutboxRepository {
  /** Eventos ainda não enviados nem descartados, do mais antigo ao mais novo. */
  findPending(limit: number): Promise<OutboxRow[]>;
  markPublished(id: string, at: Date): Promise<void>;
  markFailed(id: string, attempts: number, nextAttemptAt: Date, error: string): Promise<void>;
  /** Cria a linha em `dead_letter_events` e marca o evento como descartado, na mesma transação. */
  moveToDeadLetter(row: OutboxRow, attempts: number, error: string, at: Date): Promise<void>;
  /** Apaga da fila de descarte o que for mais antigo que `before` (retenção de 7 dias). */
  purgeDeadLetters(before: Date): Promise<number>;
}

export const OUTBOX_REPOSITORY = Symbol('OUTBOX_REPOSITORY');

@Injectable()
export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPending(limit: number): Promise<OutboxRow[]> {
    return this.prisma.outboxEvent.findMany({
      where: { publishedAt: null, deadAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markPublished(id: string, at: Date): Promise<void> {
    await this.prisma.outboxEvent.update({ where: { id }, data: { publishedAt: at, lastError: null } });
  }

  async markFailed(id: string, attempts: number, nextAttemptAt: Date, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({ where: { id }, data: { attempts, nextAttemptAt, lastError: error } });
  }

  async moveToDeadLetter(row: OutboxRow, attempts: number, error: string, at: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.deadLetterEvent.create({
        data: { eventId: row.id, type: row.type, payload: row.payload as Prisma.InputJsonValue, error, attempts },
      }),
      this.prisma.outboxEvent.update({ where: { id: row.id }, data: { attempts, lastError: error, deadAt: at } }),
    ]);
  }

  async purgeDeadLetters(before: Date): Promise<number> {
    const { count } = await this.prisma.deadLetterEvent.deleteMany({ where: { createdAt: { lt: before } } });
    return count;
  }
}
