import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class InventoryAdjustmentsService {
  create(_clinicId: string, _lotId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-26', 'Ajuste de inventário de um lote, com justificativa');
  }
}
