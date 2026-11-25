import { describe, expect, it } from 'vitest';
import { PermissionMatrixService } from '../access/permission-matrix.service';
import { permissionsOf } from '../access/permissions';
import { PROFILES } from '../access/profile';
import type { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from './permissions.service';

describe('PermissionsService.mine', () => {
  // A matrix that was never loaded uses the defaults, so these tests need no database.
  const service = new PermissionsService(new PermissionMatrixService({} as unknown as PrismaService));

  it('returns the profile, the matrix permissions and the clinics of the caller', () => {
    expect(service.mine({ userId: 'u1', profile: 'admin', clinicIds: ['clinic-1'] })).toEqual({
      profile: 'admin',
      permissions: [...permissionsOf('admin')],
      clinics: ['clinic-1'],
    });
  });

  it('gives the budget controller only the budget scopes', () => {
    const result = service.mine({ userId: 'u2', profile: 'budget-controller', clinicIds: ['clinic-1'] });
    expect(result.permissions).toEqual(['stock:budget:read', 'stock:budget:cost:write']);
  });

  it('returns no clinics for the superuser (which means all of them)', () => {
    expect(service.mine({ userId: 'root', profile: 'superuser', clinicIds: [] }).clinics).toEqual([]);
  });

  it('never exposes the service-to-service scope to a user profile', () => {
    for (const profile of PROFILES) {
      expect(service.mine({ userId: 'u', profile, clinicIds: [] }).permissions).not.toContain('stock:service');
    }
  });

  it('returns copies, so changing the answer cannot change the permission matrix', () => {
    const result = service.mine({ userId: 'u1', profile: 'warehouse', clinicIds: ['clinic-1'] });
    result.permissions.push('stock:admin');
    expect(service.mine({ userId: 'u1', profile: 'warehouse', clinicIds: [] }).permissions).not.toContain('stock:admin');
  });
});