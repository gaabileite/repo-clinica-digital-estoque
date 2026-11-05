import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class InternalService {
  provisionClinic(_clinicId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-55', 'Provisiona o tenant de estoque (evento org.clinic.created)');
  }
  dailyScan(): Promise<never> {
    return notImplemented('E-56', 'Varredura diária: validade, consumo aprendido e prazo dos recebimentos');
  }
}
