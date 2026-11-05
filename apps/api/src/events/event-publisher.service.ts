import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';
import type { PublishedEvent } from './event-types';

/**
 * Publica eventos de domínio.
 * TODO(ADR-001): gravar na tabela outbox_events na mesma transação da movimentação e despachar depois.
 */
@Injectable()
export class EventPublisher {
  publish(_type: PublishedEvent, _subject: string, _data: unknown): Promise<void> {
    return notImplemented('P-01..P-06', 'Publicação de eventos');
  }
}
