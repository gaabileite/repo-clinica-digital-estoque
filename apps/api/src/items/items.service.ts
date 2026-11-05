import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';
import { CreateItemDto } from './dto/create-item.dto';

@Injectable()
export class ItemsService {
  list(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-01', 'Lista insumos (busca por código, categoria, situação)');
  }
  create(_clinicId: string, _body: CreateItemDto): Promise<never> {
    return notImplemented('E-02', 'Cria insumo; o código INS-0001 é gerado pelo sistema');
  }
  detail(_clinicId: string, _itemId: string): Promise<never> {
    return notImplemented('E-03', 'Detalhe do insumo');
  }
  update(_clinicId: string, _itemId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-04', 'Altera insumo (If-Match obrigatório; o código não muda)');
  }
  deactivate(_clinicId: string, _itemId: string): Promise<never> {
    return notImplemented('E-05', 'Inativa o insumo (nunca apaga se há saldo)');
  }
  reactivate(_clinicId: string, _itemId: string): Promise<never> {
    return notImplemented('E-05', 'Reativa o insumo');
  }
  units(): Promise<never> {
    return notImplemented('E-06', 'Lista de unidades de medida');
  }
}
