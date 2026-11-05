import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class AlertsService {
  list(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-41', 'Condições de alerta vigentes do perfil');
  }
}
