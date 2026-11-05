import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PublishedEvent } from './event-types';

export interface PublishOptions {
  clinicId?: string;
  /** Transação da movimentação: o evento só existe se ela for confirmada (padrão outbox). */
  tx?: Prisma.TransactionClient;
}

/**
 * Grava o evento no outbox. Não envia nada: quem envia é o {@link OutboxDispatcher}.
 * Use sempre dentro da transação que altera o saldo: `prisma.$transaction(async (tx) => { ...; publish(..., { tx }) })`.
 */
@Injectable()
export class EventPublisher {
  constructor(private readonly prisma: PrismaService) {}

  async publish(type: PublishedEvent, subject: string, data: unknown, options: PublishOptions = {}): Promise<string> {
    const client = options.tx ?? this.prisma;
    const row = await client.outboxEvent.create({
      data: { type, subject, clinicId: options.clinicId ?? null, payload: data as Prisma.InputJsonValue },
      select: { id: true },
    });
    return row.id;
  }
}
