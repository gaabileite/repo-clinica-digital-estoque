import type { AuthContext } from './auth-context';
import { isProfile } from './profile';

/**
 * Turns the claims of an already verified IAM token into the AuthContext (contract section 2):
 * `sub` (user id), `profile` and `clinic_ids`.
 * Returns undefined when a claim is missing or has the wrong shape, so the caller answers 401.
 * If the IAM ever uses other claim names, this is the only file that needs to change.
 */
export function authContextFromClaims(claims: Record<string, unknown>): AuthContext | undefined {
  const userId = claims.sub;
  const profile = claims.profile;
  if (typeof userId !== 'string' || userId === '') return undefined;
  if (!isProfile(profile)) return undefined;

  // The superuser belongs to no clinic (requirement RF-02), so the claim may be missing for them.
  const rawClinicIds = claims.clinic_ids ?? (profile === 'superuser' ? [] : undefined);
  if (!Array.isArray(rawClinicIds) || !rawClinicIds.every((id) => typeof id === 'string')) return undefined;

  return { userId, profile, clinicIds: rawClinicIds as string[] };
}