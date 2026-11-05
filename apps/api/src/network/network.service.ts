import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class NetworkService {
  dashboard(): Promise<never> {
    return notImplemented('E-46', 'Situação por clínica e indicadores consolidados');
  }
  balances(_query: Record<string, string>): Promise<never> {
    return notImplemented('E-47', 'Saldo de um código de insumo em todas as clínicas');
  }
  weeklyConsumption(_query: Record<string, string>): Promise<never> {
    return notImplemented('E-48', 'Consumo semanal na rede ou por clínica');
  }
  report(_report: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-49', 'Relatórios consolidados da rede');
  }
}
