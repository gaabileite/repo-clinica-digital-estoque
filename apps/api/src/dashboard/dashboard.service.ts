import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class DashboardService {
  summary(_clinicId: string): Promise<never> {
    return notImplemented('E-16', 'Painel por perfil');
  }
  weeklyConsumption(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-17', 'Consumo semanal de um insumo');
  }
}
