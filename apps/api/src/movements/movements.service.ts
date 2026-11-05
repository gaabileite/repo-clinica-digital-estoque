import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class MovementsService {
  list(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-39', 'Livro de movimentações (cursor, filtros)');
  }
  reverse(_clinicId: string, _movementId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-25', 'Estorna uma saída; o original permanece');
  }
}
