import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class ProcedureConsumptionsService {
  preview(_clinicId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-19', 'Prévia da baixa de um pacote, sem baixar');
  }
  confirm(_clinicId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-20', 'Confirma a baixa de um pacote de insumos');
  }
  listPending(_clinicId: string): Promise<never> {
    return notImplemented('E-21', 'Baixas pendentes geradas por execuções de procedimento');
  }
  confirmPending(_clinicId: string, _pendingId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-22', 'Confirma a proposta, com ajustes e justificativa');
  }
  dismissPending(_clinicId: string, _pendingId: string, _body: Record<string, unknown>): Promise<never> {
    return notImplemented('E-22', 'Descarta a proposta, com motivo');
  }
}
