import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Observable } from 'rxjs';

export const IDEMPOTENT_KEY = 'estoque:idempotent';

/** Marca o POST que altera saldo: o cabeçalho Idempotency-Key é obrigatório (contrato, seção 2). */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);

/**
 * Esqueleto. Hoje só exige o cabeçalho.
 * TODO(E4-H1): guardar chave, hash do corpo e resposta por 72 h (tabela idempotency_keys);
 * mesma chave e mesmo corpo devolvem a resposta original; corpo diferente devolve 422 IDEMPOTENCY_CONFLICT.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const required = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required) {
      const request = context.switchToHttp().getRequest<Request>();
      if (!request.header('idempotency-key')) {
        throw new BadRequestException({
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          detail: 'Informe o cabeçalho Idempotency-Key nesta operação.',
        });
      }
    }
    return next.handle();
  }
}
