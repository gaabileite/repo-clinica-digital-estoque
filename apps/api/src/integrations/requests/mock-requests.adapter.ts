import { Injectable } from '@nestjs/common';
import { MOCK_CLINIC_DENTISTRY_ID } from '../mock-ids';
import type { RequestsAdapter, SupplyRequest, SupplyRequestStatus } from './requests.adapter';

/** Fixed requests. They are returned for whichever clinic asks, with that clinic's id filled in. */
const TEMPLATES: Array<Omit<SupplyRequest, 'clinicId'>> = [
  {
    id: 'mock-request-1',
    number: 'REQ-0001',
    requestedOn: '2026-10-28',
    status: 'open',
    items: [
      { itemId: 'mock-item-1', quantity: '20.000' },
      { itemId: 'mock-item-2', quantity: '5.000' },
    ],
  },
  {
    id: 'mock-request-2',
    number: 'REQ-0002',
    requestedOn: '2026-10-20',
    status: 'cancelled',
    items: [{ itemId: 'mock-item-1', quantity: '10.000' }],
  },
  {
    id: 'mock-request-3',
    number: 'REQ-0003',
    requestedOn: '2026-11-02',
    status: 'open',
    items: [{ itemId: 'mock-item-3', quantity: '8.000' }],
  },
];

const forClinic = (clinicId: string): SupplyRequest[] =>
  TEMPLATES.map((template) => ({ ...structuredClone(template), clinicId }));

/**
 * Fake Requests module. It answers the same three requests for any clinic, so the receipts screen can
 * be built and tried on any database. Its item ids are invented: the real module will use real ids.
 */
@Injectable()
export class MockRequestsAdapter implements RequestsAdapter {
  async listRequests(filter: { clinicId: string; status?: SupplyRequestStatus }) {
    return forClinic(filter.clinicId).filter((r) => filter.status === undefined || r.status === filter.status);
  }

  async getRequest(requestId: string) {
    // The id does not say which clinic it belongs to, so the answer carries the first mock clinic.
    return forClinic(MOCK_CLINIC_DENTISTRY_ID).find((r) => r.id === requestId) ?? null;
  }
}