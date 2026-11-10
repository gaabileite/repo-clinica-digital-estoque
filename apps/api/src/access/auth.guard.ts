import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app.config';
import { IS_PUBLIC_KEY } from './access.decorators';
import type { AuthContext } from './auth-context';
import { isProfile } from './profile';
import { TokenVerifier } from './token-verifier';

/**
 * Identifies the caller (E0-H4).
 * 1. `Authorization: Bearer <token>`: the IAM token is verified. If it is present but invalid,
 *    the answer is 401, even when the development headers are also there.
 * 2. Otherwise, the development headers (x-dev-*), only when DEV_AUTH_ENABLED=true (never in production).
 * 3. Otherwise, 401.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly tokenVerifier: TokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    const token = readBearerToken(request);
    if (token !== undefined) {
      const auth = await this.tokenVerifier.verify(token);
      if (!auth) throw new UnauthorizedException({ code: 'UNAUTHORIZED', detail: 'Token inválido ou expirado.' });
      request.auth = auth;
      return true;
    }

    const auth = this.config.devAuthEnabled ? readDevAuth(request) : undefined;
    if (!auth) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', detail: 'Autenticação necessária.' });
    }
    request.auth = auth;
    return true;
  }
}

function readBearerToken(request: Request): string | undefined {
  const match = /^Bearer\s+(.+)$/i.exec(request.header('authorization') ?? '');
  return match?.[1]?.trim() || undefined;
}

function readDevAuth(request: Request): AuthContext | undefined {
  const userId = request.header('x-dev-user');
  const profile = request.header('x-dev-profile');
  if (!userId || !isProfile(profile)) return undefined;
  const clinics = (request.header('x-dev-clinics') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return { userId, profile, clinicIds: clinics };
}