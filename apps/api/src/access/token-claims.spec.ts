import { describe, expect, it } from 'vitest';
import { authContextFromClaims } from './token-claims';

describe('authContextFromClaims', () => {
  it('builds the context from a valid admin token', () => {
    expect(authContextFromClaims({ sub: 'user-1', profile: 'admin', clinic_ids: ['clinic-1'] })).toEqual({
      userId: 'user-1',
      profile: 'admin',
      clinicIds: ['clinic-1'],
    });
  });

  it('accepts a superuser without clinic_ids', () => {
    expect(authContextFromClaims({ sub: 'root', profile: 'superuser' })?.clinicIds).toEqual([]);
  });

  it('rejects a non-superuser without clinic_ids', () => {
    expect(authContextFromClaims({ sub: 'user-1', profile: 'admin' })).toBeUndefined();
  });

  it('rejects an unknown profile', () => {
    expect(authContextFromClaims({ sub: 'user-1', profile: 'manager', clinic_ids: [] })).toBeUndefined();
  });

  it('rejects a missing or empty subject', () => {
    expect(authContextFromClaims({ profile: 'admin', clinic_ids: [] })).toBeUndefined();
    expect(authContextFromClaims({ sub: '', profile: 'admin', clinic_ids: [] })).toBeUndefined();
  });

  it('rejects clinic_ids that is not a list of strings', () => {
    expect(authContextFromClaims({ sub: 'u', profile: 'admin', clinic_ids: 'clinic-1' })).toBeUndefined();
    expect(authContextFromClaims({ sub: 'u', profile: 'admin', clinic_ids: [1, 2] })).toBeUndefined();
  });
});