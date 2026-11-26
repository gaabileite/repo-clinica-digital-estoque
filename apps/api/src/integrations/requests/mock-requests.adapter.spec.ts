import { describe, expect, it } from 'vitest';
import { MockRequestsAdapter } from './mock-requests.adapter';

describe('MockRequestsAdapter', () => {
  const adapter = new MockRequestsAdapter();
  const clinicId = '11111111-1111-4111-8111-111111111111';

  it('lists the open requests for any clinic, with that clinic id filled in', async () => {
    const open = await adapter.listRequests({ clinicId, status: 'open' });
    expect(open.map((r) => r.number)).toEqual(['REQ-0001', 'REQ-0003']);
    expect(open.every((r) => r.clinicId === clinicId)).toBe(true);
  });

  it('lists every request when no status is given', async () => {
    expect(await adapter.listRequests({ clinicId })).toHaveLength(3);
  });

  it('returns a request with its items, or null when unknown', async () => {
    expect((await adapter.getRequest('mock-request-1'))?.items).toHaveLength(2);
    expect(await adapter.getRequest('does-not-exist')).toBeNull();
  });
});