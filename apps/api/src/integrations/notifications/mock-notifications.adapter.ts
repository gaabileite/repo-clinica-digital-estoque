import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  NotificationCategory,
  NotificationsAdapter,
  SendNotificationInput,
} from './notifications.adapter';

/**
 * Fake Notifications module. Delivers nothing: it remembers what it received,
 * so tests can check it. The memory is lost when the API restarts.
 */
@Injectable()
export class MockNotificationsAdapter implements NotificationsAdapter {
  private readonly categories = new Map<string, NotificationCategory>();
  private readonly sent: SendNotificationInput[] = [];
  /** dedupeKey -> id of the notification already sent with that key. */
  private readonly sentByDedupeKey = new Map<string, string>();

  async registerCategory(category: NotificationCategory): Promise<void> {
    this.categories.set(category.id, structuredClone(category));
  }

  async send(input: SendNotificationInput) {
    const existingId = this.sentByDedupeKey.get(input.dedupeKey);
    if (existingId) return { notificationId: existingId, deduplicated: true };

    const notificationId = randomUUID();
    this.sentByDedupeKey.set(input.dedupeKey, notificationId);
    this.sent.push(structuredClone(input));
    return { notificationId, deduplicated: false };
  }

  /** Mock-only helpers (not part of the interface): let tests inspect what happened. */
  getCategories(): NotificationCategory[] {
    return [...this.categories.values()];
  }

  getSent(): SendNotificationInput[] {
    return [...this.sent];
  }
}