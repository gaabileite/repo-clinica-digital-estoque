import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class IncorrectReceiptsService {
  list(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-34', 'Recebimentos incorretos, com prazo restante');
  }
  create(_clinicId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-35', 'Registra produto recebido incorretamente');
  }
  exchange(_clinicId: string, _id: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-36', 'Registra a troca pela empresa');
  }
  incorporate(_clinicId: string, _id: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-37', 'Incorpora ao estoque após o prazo (gera entrada)');
  }
  discard(_clinicId: string, _id: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-38', 'Descarta após o prazo, com justificativa');
  }
}
