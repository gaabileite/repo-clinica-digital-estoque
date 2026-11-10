import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { PROFILES } from './profile';
import { UserCacheService } from './user-cache.service';

/** A fake Prisma with just the three methods the service uses. */
function fakeClient() {
  return { userCache: { upsert: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() } };
}
const serviceWith = (client: unknown) => new UserCacheService(client as PrismaService);

describe('UserCacheService', () => {
  it('stores the profile in the database format and does not touch "active" on an update', async () => {
    const client = fakeClient();
    await serviceWith(client).upsert({ id: 'u1', name: 'Maria', profile: 'budget-controller' });
    expect(client.userCache.upsert).toHaveBeenCalledWith({
      where: { id: 'u1' },
      create: { id: 'u1', name: 'Maria', profile: 'BUDGET_CONTROLLER', active: true },
      update: { name: 'Maria', profile: 'BUDGET_CONTROLLER' },
    });
  });

  it('writes "active" on create and update when it is informed', async () => {
    const client = fakeClient();
    await serviceWith(client).upsert({ id: 'u1', name: 'Maria', profile: 'admin', active: false });
    expect(client.userCache.upsert).toHaveBeenCalledWith({
      where: { id: 'u1' },
      create: { id: 'u1', name: 'Maria', profile: 'ADMIN', active: false },
      update: { name: 'Maria', profile: 'ADMIN', active: false },
    });
  });

  it('deactivates instead of deleting', async () => {
    const client = fakeClient();
    await serviceWith(client).deactivate('u1');
    expect(client.userCache.updateMany).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { active: false } });
  });

  it('reads a user back with our profile format', async () => {
    const client = fakeClient();
    client.userCache.findUnique.mockResolvedValue({
      id: 'u1', name: 'Maria', profile: 'WAREHOUSE', active: true, updatedAt: new Date(),
    });
    expect(await serviceWith(client).find('u1')).toEqual({
      id: 'u1', name: 'Maria', profile: 'warehouse', active: true,
    });
  });

  it('returns null for an unknown user', async () => {
    const client = fakeClient();
    client.userCache.findUnique.mockResolvedValue(null);
    expect(await serviceWith(client).find('nobody')).toBeNull();
  });

  it('uses the transaction client when one is given', async () => {
    const client = fakeClient();
    const tx = fakeClient();
    await serviceWith(client).upsert({ id: 'u1', name: 'Maria', profile: 'admin' }, tx as never);
    expect(tx.userCache.upsert).toHaveBeenCalledTimes(1);
    expect(client.userCache.upsert).not.toHaveBeenCalled();
  });

  it('converts every profile to the database format and back', async () => {
    for (const profile of PROFILES) {
      const client = fakeClient();
      await serviceWith(client).upsert({ id: 'u1', name: 'Maria', profile });
      const saved = client.userCache.upsert.mock.calls[0][0] as { create: { profile: string } };
      client.userCache.findUnique.mockResolvedValue({
        id: 'u1', name: 'Maria', profile: saved.create.profile, active: true, updatedAt: new Date(),
      });
      expect((await serviceWith(client).find('u1'))?.profile).toBe(profile);
    }
  });
});