import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class CategoriesService {
  list(_clinicId: string): Promise<never> {
    return notImplemented('E-07', 'Categorias de insumo da clínica, com nº de insumos');
  }
  create(_clinicId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-08', 'Cria categoria');
  }
  update(_clinicId: string, _categoryId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-08', 'Renomeia ou inativa (recusa se há insumo ativo)');
  }
}
