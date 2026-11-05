import { Injectable, Logger } from '@nestjs/common';
import type { CloudEvent } from './event-types';

export const EVENT_TRANSPORT = Symbol('EVENT_TRANSPORT');

/** Como o evento sai do módulo. Quando a plataforma tiver barramento, troque a implementação. */
export interface EventTransport {
  /** Lança erro se a entrega falhar: o despachante tenta de novo. */
  send(event: CloudEvent): Promise<void>;
}

/** Decisão D6: até haver barramento na plataforma, o envio é simulado (só registra em log). */
@Injectable()
export class SimulatedEventTransport implements EventTransport {
  private readonly logger = new Logger('EventTransport');

  async send(event: CloudEvent): Promise<void> {
    this.logger.log(`(simulado) ${event.type} subject=${event.subject ?? '-'} id=${event.id}`);
  }
}
