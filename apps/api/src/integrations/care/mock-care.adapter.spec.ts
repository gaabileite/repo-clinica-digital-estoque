import { describe, expect, it } from 'vitest';
import { MOCK_CLINIC_PHYSIO_ID } from '../mock-ids';
import { MockCareAdapter } from './mock-care.adapter';

describe('MockCareAdapter', () => {
  const adapter = new MockCareAdapter();

  it('lists the procedures of one clinic only', async () => {
    const procedures = await adapter.listProcedures(MOCK_CLINIC_PHYSIO_ID);
    expect(procedures.length).toBeGreaterThan(0);
    expect(procedures.every((p) => p.clinicId === MOCK_CLINIC_PHYSIO_ID)).toBe(true);
  });

  it('finds an execution by id and returns null for an unknown one', async () => {
    expect((await adapter.getProcedureExecution('mock-execution-2'))?.status).toBe('cancelled');
    expect(await adapter.getProcedureExecution('does-not-exist')).toBeNull();
  });
});