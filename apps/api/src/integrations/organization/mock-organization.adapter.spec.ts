import { describe, expect, it } from 'vitest';
import { MOCK_CLINIC_DENTISTRY_ID, MOCK_CLINIC_INACTIVE_ID, MOCK_CLINIC_PHYSIO_ID } from '../mock-ids';
import { MockOrganizationAdapter } from './mock-organization.adapter';

describe('MockOrganizationAdapter', () => {
  const adapter = new MockOrganizationAdapter();

  it('lists only active clinics', async () => {
    const clinics = await adapter.listActiveClinics();
    expect(clinics.map((c) => c.id)).toEqual([MOCK_CLINIC_DENTISTRY_ID, MOCK_CLINIC_PHYSIO_ID]);
  });

  it('returns an inactive clinic by id and null for an unknown one', async () => {
    expect((await adapter.getClinic(MOCK_CLINIC_INACTIVE_ID))?.active).toBe(false);
    expect(await adapter.getClinic('does-not-exist')).toBeNull();
  });
});