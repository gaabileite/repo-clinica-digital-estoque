import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { ProcessedEventsService } from './processed-events.service';

const fakePrisma = (create: () => Promise<unknown>) => ({ processedEvent: { create } }) as unknown as PrismaService;

describe('deduplicação de eventos consumidos', () => {
  it('a primeira vez devolve true', async () => {
    const service = new ProcessedEventsService(fakePrisma(async () => ({})));
    expect(await service.claim('e1', 'iam.user.created')).toBe(true);
  });

  it('id repetido (violação de unicidade) devolve false', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: '5' });
    const service = new ProcessedEventsService(fakePrisma(async () => Promise.reject(duplicate)));
    expect(await service.claim('e1', 'iam.user.created')).toBe(false);
  });

  it('outro erro do banco não é engolido', async () => {
    const service = new ProcessedEventsService(fakePrisma(async () => Promise.reject(new Error('banco caiu'))));
    await expect(service.claim('e1', 'x')).rejects.toThrow('banco caiu');
  });
});
