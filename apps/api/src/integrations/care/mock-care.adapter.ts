import { Injectable } from '@nestjs/common';
import { MOCK_CLINIC_DENTISTRY_ID, MOCK_CLINIC_PHYSIO_ID } from '../mock-ids';
import type { CareAdapter, CareProcedure, CareProcedureExecution } from './care.adapter';

const PROCEDURES: CareProcedure[] = [
  { id: 'mock-procedure-restoration', clinicId: MOCK_CLINIC_DENTISTRY_ID, name: 'Dental restoration' },
  { id: 'mock-procedure-cleaning', clinicId: MOCK_CLINIC_DENTISTRY_ID, name: 'Dental cleaning' },
  { id: 'mock-procedure-ultrasound', clinicId: MOCK_CLINIC_PHYSIO_ID, name: 'Therapeutic ultrasound' },
];

const EXECUTIONS: CareProcedureExecution[] = [
  { id: 'mock-execution-1', clinicId: MOCK_CLINIC_DENTISTRY_ID, procedureId: 'mock-procedure-restoration', status: 'completed', occurredAt: '2026-11-05T14:00:00.000Z' },
  { id: 'mock-execution-2', clinicId: MOCK_CLINIC_DENTISTRY_ID, procedureId: 'mock-procedure-cleaning', status: 'cancelled', occurredAt: '2026-11-06T09:30:00.000Z' },
];

/** Fake Care module with a few procedures and two executions (one completed, one cancelled). */
@Injectable()
export class MockCareAdapter implements CareAdapter {
  async listProcedures(clinicId: string) {
    return PROCEDURES.filter((p) => p.clinicId === clinicId).map((p) => structuredClone(p));
  }

  async getProcedureExecution(executionId: string) {
    const execution = EXECUTIONS.find((e) => e.id === executionId);
    return execution ? structuredClone(execution) : null;
  }
}