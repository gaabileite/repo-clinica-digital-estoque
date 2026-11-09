import { describe, expect, it } from 'vitest';
import { MockNotificationsAdapter } from './mock-notifications.adapter';
import type { SendNotificationInput } from './notifications.adapter';

const input: SendNotificationInput = {
  categoryId: 'stock.critical-level',
  clinicId: 'clinic-1',
  recipientUserIds: ['user-1'],
  title: 'Critical level',
  body: 'Gloves are about to run out.',
  groupKey: 'clinic-1:stock.critical-level',
  dedupeKey: 'clinic-1:item-1:stock.critical-level',
};

describe('MockNotificationsAdapter', () => {
  it('registers an alert category', async () => {
    const adapter = new MockNotificationsAdapter();
    await adapter.registerCategory({ id: 'stock.critical-level', name: 'Critical level', defaultChannels: ['app', 'email'] });
    expect(adapter.getCategories().map((c) => c.id)).toEqual(['stock.critical-level']);
  });

  it('sends a notification and remembers it', async () => {
    const adapter = new MockNotificationsAdapter();
    const result = await adapter.send(input);
    expect(result.deduplicated).toBe(false);
    expect(adapter.getSent()).toHaveLength(1);
  });

  it('does not send the same dedupeKey twice', async () => {
    const adapter = new MockNotificationsAdapter();
    const first = await adapter.send(input);
    const second = await adapter.send(input);
    expect(second.deduplicated).toBe(true);
    expect(second.notificationId).toBe(first.notificationId);
    expect(adapter.getSent()).toHaveLength(1);
  });
});