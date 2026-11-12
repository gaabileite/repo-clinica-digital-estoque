import { describe, expect, it } from 'vitest';
import { MOCK_CLINIC_DENTISTRY_ID } from '../mock-ids';
import { MockIamAdapter } from './mock-iam.adapter';

describe('MockIamAdapter', () => {
  const adapter = new MockIamAdapter();

  it('finds a user by id and returns null for an unknown id', async () => {
    expect((await adapter.getUser('mock-admin-dentistry'))?.profile).toBe('admin');
    expect(await adapter.getUser('does-not-exist')).toBeNull();
  });

  it('filters users by clinic and profile', async () => {
    const admins = await adapter.listUsers({ clinicId: MOCK_CLINIC_DENTISTRY_ID, profile: 'admin' });
    expect(admins.map((u) => u.id)).toEqual(['mock-admin-dentistry']);
  });

  it('leaves out inactive users when activeOnly is set', async () => {
    const filter = { clinicId: MOCK_CLINIC_DENTISTRY_ID, profile: 'warehouse' as const };
    expect(await adapter.listUsers(filter)).toHaveLength(2);
    expect(await adapter.listUsers({ ...filter, activeOnly: true })).toHaveLength(1);
  });

  it('refuses more than 100 ids in one batch', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`);
    await expect(adapter.getUsers(ids)).rejects.toThrow(RangeError);
  });
});