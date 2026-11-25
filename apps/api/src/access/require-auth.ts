import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from './auth-context';

/**
 * Narrows the optional `@CurrentAuth()` value to a real AuthContext.
 * The AuthGuard always fills it in on protected routes; this only satisfies the type.
 */
export function requireAuth(auth: AuthContext | undefined): AuthContext {
  if (!auth) throw new UnauthorizedException({ code: 'UNAUTHORIZED', detail: 'Autenticação necessária.' });
  return auth;
}