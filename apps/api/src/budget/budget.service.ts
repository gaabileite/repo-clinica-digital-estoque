import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class BudgetService {
  summary(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('RF-44', 'Visão orçamentária: valor em estoque, perdas e consumo em R$ (RF-44)');
  }
  valuation(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('RF-44', 'Valoração por insumo e por categoria (RF-44, RN-14)');
  }
  updateCost(_clinicId: string, _itemId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('RF-43', 'Custo unitário de referência do insumo (RF-43)');
  }
  toggleView(_body: Record<string, unknown>): Promise<never> {
    return notImplemented('RF-45', 'Chave de visão orçamentária do Superuser (RF-45)');
  }
}
