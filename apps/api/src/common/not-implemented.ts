import { NotImplementedException } from '@nestjs/common';

/** Marca as operações ainda não implementadas. Troque pela implementação ao pegar a história. */
export function notImplemented(ref: string, summary: string): never {
  throw new NotImplementedException({
    code: 'NOT_IMPLEMENTED',
    title: 'Ainda não implementado',
    detail: `${ref}: ${summary}`,
  });
}
