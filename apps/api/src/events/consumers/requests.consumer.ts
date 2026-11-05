import { Injectable } from '@nestjs/common';
import { notImplemented } from '../../common/not-implemented';
import type { CloudEvent } from '../event-types';

/** V-05: Mantém a lista de pedidos abertos (RF-21). A entrega é "pelo menos uma vez": trate duplicatas pelo campo `id`. */
@Injectable()
export class RequestsConsumer {
  handle(_event: CloudEvent): Promise<void> {
    return notImplemented('V-05', 'Consumo de evento');
  }
}
