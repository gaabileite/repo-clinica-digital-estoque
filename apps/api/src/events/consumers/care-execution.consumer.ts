import { Injectable } from '@nestjs/common';
import { notImplemented } from '../../common/not-implemented';
import type { CloudEvent } from '../event-types';

/** V-03/V-04: Cria a baixa pendente ou estorna a baixa da execução cancelada (RF-11, RF-16). A entrega é "pelo menos uma vez": trate duplicatas pelo campo `id`. */
@Injectable()
export class CareExecutionConsumer {
  handle(_event: CloudEvent): Promise<void> {
    return notImplemented('V-03/V-04', 'Consumo de evento');
  }
}
