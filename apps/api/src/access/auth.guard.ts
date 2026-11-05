import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app.config';
import { IS_PUBLIC_KEY } from './access.decorators';
import type { AuthContext } from './auth-context';
import { isProfile } from './profile';

/**
 * Identifica o chamador.
 * TODO(ADR-002): validar o token JWT do IAM (ou a sessão do shell). Enquanto isso, só existe a
 * autenticação de desenvolvimento por cabeçalhos, desligada por padrão e proibida em produção.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const auth = this.config.devAuthEnabled ? readDevAuth(request) : undefined;
    if (!auth) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', detail: 'Autenticação necessária.' });
    }
    request.auth = auth;
    return true;
  }
}

function readDevAuth(request: Request): AuthContext | undefined {
  const userId = request.header('x-dev-user');
  const profile = request.header('x-dev-profile');
  if (!userId || !isProfile(profile)) return undefined;
  const clinics = (request.header('x-dev-clinics') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return { userId, profile, clinicIds: clinics };
}
