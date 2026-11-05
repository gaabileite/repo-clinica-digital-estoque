import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class PackagesService {
  list(_clinicId: string): Promise<never> {
    return notImplemented('E-09', 'Lista pacotes de insumos');
  }
  create(_clinicId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-10', 'Cria pacote com insumos e quantidades padrão');
  }
  update(_clinicId: string, _packageId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-11', 'Altera ou inativa pacote');
  }
}
