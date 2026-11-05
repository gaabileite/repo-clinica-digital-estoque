import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class ReportsService {
  consumption(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-42', 'Relatório de consumo (por insumo, clínica ou semana)');
  }
  losses(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-43', 'Perdas por validade e descartes por avaria');
  }
  abc(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-44', 'Curva ABC por quantidade consumida');
  }
  createExport(_clinicId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-45', 'Exportação assíncrona (202 Accepted)');
  }
  getExport(_clinicId: string, _exportId: string): Promise<never> {
    return notImplemented('E-45', 'Consulta a exportação e a URL assinada');
  }
}
