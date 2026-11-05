import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class StockService {
  balances(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-12', 'Saldo por insumo, nível crítico, cobertura e validade mais próxima');
  }
  lots(_clinicId: string, _itemId: string): Promise<never> {
    return notImplemented('E-13', 'Lotes com saldo em ordem de validade (FEFO)');
  }
  availability(_clinicId: string, _itemId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-14', 'Disponibilidade para consumo e lote sugerido');
  }
  consumptionProfile(_clinicId: string, _itemId: string): Promise<never> {
    return notImplemented('E-15', 'Consumo médio de 30 dias e média aprendida');
  }
  leadTime(_clinicId: string, _itemId: string): Promise<never> {
    return notImplemented('E-33', 'Tempo de reposição medido ou estimado');
  }
}
