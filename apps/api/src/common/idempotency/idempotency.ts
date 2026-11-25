import { createHash } from 'node:crypto';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { from, of, type Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

export const IDEMPOTENT_KEY = 'estoque:idempotent';

/** Retenção das respostas guardadas (contrato, seção 2): 72 horas. */
export const IDEMPOTENCY_RETENTION_MS = 72 * 60 * 60 * 1000;

/** Marca o POST que altera saldo: o cabeçalho Idempotency-Key é obrigatório (contrato, seção 2). */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);

interface StoredResponse {
  status: number;
  body: unknown;
}

/** JSON com chaves em ordem fixa: o mesmo corpo gera sempre o mesmo hash, qualquer que seja a ordem das chaves. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Hash da requisição: método, caminho (sem query de paginação, que POST não usa) e corpo canônico. */
export const requestHash = (request: Pick<Request, 'method' | 'path' | 'body'>): string =>
  sha256(`${request.method} ${request.path}\n${canonicalJson(request.body ?? null)}`);

/**
 * Chave de armazenamento. O cabeçalho vale por usuário: duas pessoas (ou duas clínicas) podem usar a
 * mesma chave sem colidir, e ninguém lê a resposta de outra pessoa.
 */
export const storageKey = (userId: string, headerKey: string): string => `${userId}:${headerKey}`;

/**
 * RF-14 / contrato, seção 2: nos POSTs que alteram saldo, a mesma `Idempotency-Key` com o mesmo corpo
 * devolve a resposta original, sem repetir a operação; com corpo diferente, 422 `IDEMPOTENCY_CONFLICT`.
 * Só respostas de sucesso são guardadas: quem recebeu erro pode reenviar a mesma chave depois de corrigir.
 * Respostas guardadas vencem em 72 h (`IDEMPOTENCY_RETENTION_MS`).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const required = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const headerKey = request.header('idempotency-key')?.trim();
    if (!headerKey) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        detail: 'Informe o cabeçalho Idempotency-Key nesta operação.',
      });
    }
    if (headerKey.length > 255) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_INVALID',
        detail: 'Idempotency-Key deve ter até 255 caracteres.',
      });
    }

    const key = storageKey(request.auth?.userId ?? 'anonymous', headerKey);
    const hash = requestHash(request);

    return from(this.find(key)).pipe(
      mergeMap((existing) => {
        if (existing) {
          if (existing.requestHash !== hash) {
            throw new UnprocessableEntityException({
              code: 'IDEMPOTENCY_CONFLICT',
              detail: 'A Idempotency-Key já foi usada com outro conteúdo. Gere uma chave nova para uma nova operação.',
            });
          }
          const stored = existing.response as unknown as StoredResponse;
          response.status(stored.status);
          response.setHeader('Idempotent-Replayed', 'true');
          return of(stored.body);
        }
        return next.handle().pipe(
          mergeMap((body) =>
            from(this.save(key, hash, { status: response.statusCode, body: body ?? null })).pipe(mergeMap(() => of(body))),
          ),
        );
      }),
    );
  }

  private async find(key: string) {
    const record = await this.prisma.idempotencyRecord.findUnique({ where: { key } });
    if (!record) return null;
    if (Date.now() - record.createdAt.getTime() > IDEMPOTENCY_RETENTION_MS) {
      // Vencida: libera a chave para uma nova operação.
      await this.prisma.idempotencyRecord.deleteMany({ where: { key, createdAt: record.createdAt } });
      return null;
    }
    return record;
  }

  private async save(key: string, hash: string, stored: StoredResponse): Promise<void> {
    try {
      await this.prisma.idempotencyRecord.create({
        data: { key, requestHash: hash, response: JSON.parse(JSON.stringify(stored)) },
      });
    } catch (error) {
      // Duas requisições simultâneas com a mesma chave: a primeira a gravar vale (violação de chave única).
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }
}
