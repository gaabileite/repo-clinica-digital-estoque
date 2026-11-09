import { describe, expect, it } from 'vitest';
import { MOCK_CLINIC_DENTISTRY_ID } from '../mock-ids';
import { MockRequestsAdapter } from './mock-requests.adapter';

describe('MockRequestsAdapter', () => {
  const adapter = new MockRequestsAdapter();

  it('lists only the open requests of the given clinic', async () => {
    const open = await adapter.listRequests({ clinicId: MOCK_CLINIC_DENTISTRY_ID, status: 'open' });
    expect(open.map((r) => r.number)).toEqual(['REQ-0001']);
  });

  it('returns a request with its items, or null when unknown', async () => {
    expect((await adapter.getRequest('mock-request-1'))?.items).toHaveLength(2);
    expect(await adapter.getRequest('does-not-exist')).toBeNull();
  });
});