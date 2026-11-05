import { Injectable } from '@nestjs/common';
import { notImplemented } from '../common/not-implemented';

@Injectable()
export class AuditService {
  trail(_clinicId: string, _query: Record<string, string>): Promise<never> {
    return notImplemented('E-40', 'Trilha de auditoria do módulo');
  }
}
