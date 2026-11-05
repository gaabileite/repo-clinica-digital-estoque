import { Injectable } from '@nestjs/common';
import { notImplemented } from '../../common/not-implemented';
import type { CloudEvent } from '../event-types';

/** V-01: Atualiza o cache local de usuários e bloqueia retiradas de usuário inativado (RF-02). A entrega é "pelo menos uma vez": trate duplicatas pelo campo `id`. */
@Injectable()
export class IamUserConsumer {
  handle(_event: CloudEvent): Promise<void> {
    return notImplemented('V-01', 'Consumo de evento');
  }
}
