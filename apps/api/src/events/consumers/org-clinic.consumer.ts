import { Injectable } from '@nestjs/common';
import { notImplemented } from '../../common/not-implemented';
import type { CloudEvent } from '../event-types';

/** V-02: Provisiona ou arquiva o tenant de estoque da clínica (RF-01). A entrega é "pelo menos uma vez": trate duplicatas pelo campo `id`. */
@Injectable()
export class OrgClinicConsumer {
  handle(_event: CloudEvent): Promise<void> {
    return notImplemented('V-02', 'Consumo de evento');
  }
}
