import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { isProfile, type Profile } from '../../access/profile';
import { UserCacheService } from '../../access/user-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { CloudEvent } from '../event-types';
import { ProcessedEventsService } from '../processed-events.service';

/**
 * What the IAM sends about a user in iam.user.created and iam.user.updated.
 * This shape is an assumption until the IAM team confirms it (see the pending list in the PR).
 */
export interface IamUserData {
  id: string;
  name: string;
  profile: Profile;
  active?: boolean;
}

export function parseIamUserData(data: unknown): IamUserData | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const { id, name, profile, active } = data as Record<string, unknown>;
  if (typeof id !== 'string' || id === '') return undefined;
  if (typeof name !== 'string' || name === '') return undefined;
  if (!isProfile(profile)) return undefined;
  return { id, name, profile, active: typeof active === 'boolean' ? active : undefined };
}

function readUserId(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const id = (data as Record<string, unknown>).id;
  return typeof id === 'string' && id !== '' ? id : undefined;
}

/**
 * V-01: keeps the local copy of the IAM users up to date (requirement RF-02).
 * Delivery is "at least once": the same event can arrive twice, so each event id is claimed
 * in the same transaction that applies its effect (decision D6).
 */
@Injectable()
export class IamUserConsumer {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processedEvents: ProcessedEventsService,
    private readonly users: UserCacheService,
  ) {}

  async handle(event: CloudEvent): Promise<void> {
    const kind = /iam\.user\.(created|updated|deactivated)$/.exec(event.type)?.[1];
    if (!kind) return; // not an event this consumer cares about

    if (kind === 'deactivated') {
      const userId = readUserId(event.data);
      if (!userId) throw new Error(`Event ${event.id}: payload without a user id.`);
      await this.applyOnce(event, (tx) => this.users.deactivate(userId, tx));
      return;
    }

    const user = parseIamUserData(event.data);
    if (!user) throw new Error(`Event ${event.id}: unusable user payload.`);
    await this.applyOnce(event, (tx) => this.users.upsert(user, tx));
  }

  /** Runs the effect only the first time this event id is seen, all inside one transaction. */
  private applyOnce(event: CloudEvent, effect: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const firstTime = await this.processedEvents.claim(event.id, event.type, tx);
      if (!firstTime) return;
      await effect(tx);
    });
  }
}