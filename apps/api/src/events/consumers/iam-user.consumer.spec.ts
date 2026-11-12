import { describe, expect, it, vi } from 'vitest';
import type { UserCacheService } from '../../access/user-cache.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CloudEvent } from '../event-types';
import type { ProcessedEventsService } from '../processed-events.service';
import { IamUserConsumer } from './iam-user.consumer';

const tx = {}; // stands for the transaction client

/** Builds the consumer with fakes. `firstTime` says whether the event id is new. */
function setup(firstTime = true) {
  const prisma = { $transaction: vi.fn(async (work: (client: unknown) => Promise<void>) => work(tx)) };
  const processedEvents = { claim: vi.fn(async (_id: string, _type: string, _tx: unknown) => firstTime) };
  const users = {
    upsert: vi.fn(async (_user: unknown, _tx: unknown) => undefined),
    deactivate: vi.fn(async (_userId: string, _tx: unknown) => undefined),
  };
  const consumer = new IamUserConsumer(
    prisma as unknown as PrismaService,
    processedEvents as unknown as ProcessedEventsService,
    users as unknown as UserCacheService,
  );
  return { consumer, processedEvents, users };
}

const event = (type: string, data: unknown) => ({ id: 'evt-1', type, data }) as unknown as CloudEvent;

describe('IamUserConsumer', () => {
  it('saves a created user', async () => {
    const { consumer, processedEvents, users } = setup();
    await consumer.handle(event('iam.user.created', { id: 'u1', name: 'Maria', profile: 'admin' }));
    expect(processedEvents.claim).toHaveBeenCalledWith('evt-1', 'iam.user.created', tx);
    expect(users.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1', name: 'Maria', profile: 'admin' }), tx);
  });

  it('saves an updated user', async () => {
    const { consumer, users } = setup();
    await consumer.handle(event('iam.user.updated', { id: 'u1', name: 'Maria S.', profile: 'warehouse' }));
    expect(users.upsert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Maria S.', profile: 'warehouse' }), tx);
  });

  it('deactivates a deactivated user', async () => {
    const { consumer, users } = setup();
    await consumer.handle(event('iam.user.deactivated', { id: 'u1' }));
    expect(users.deactivate).toHaveBeenCalledWith('u1', tx);
  });

  it('ignores an event it already processed', async () => {
    const { consumer, users } = setup(false);
    await consumer.handle(event('iam.user.created', { id: 'u1', name: 'Maria', profile: 'admin' }));
    expect(users.upsert).not.toHaveBeenCalled();
  });

  it('ignores events of other types without claiming them', async () => {
    const { consumer, processedEvents, users } = setup();
    await consumer.handle(event('org.clinic.created', { id: 'c1' }));
    expect(processedEvents.claim).not.toHaveBeenCalled();
    expect(users.upsert).not.toHaveBeenCalled();
  });

  it('throws on an unusable payload, without claiming the event', async () => {
    const { consumer, processedEvents } = setup();
    await expect(
      consumer.handle(event('iam.user.updated', { id: 'u1', name: 'Maria', profile: 'manager' })),
    ).rejects.toThrow(/payload/);
    expect(processedEvents.claim).not.toHaveBeenCalled();
  });
});