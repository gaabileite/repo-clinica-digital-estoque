import { Injectable } from '@nestjs/common';
import { MOCK_CLINIC_DENTISTRY_ID, MOCK_CLINIC_PHYSIO_ID } from '../mock-ids';
import type { RequestsAdapter, SupplyRequest, SupplyRequestStatus } from './requests.adapter';

const REQUESTS: SupplyRequest[] = [
  {
    id: 'mock-request-1',
    number: 'REQ-0001',
    clinicId: MOCK_CLINIC_DENTISTRY_ID,
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
    clinicId: MOCK_CLINIC_DENTISTRY_ID,
    requestedOn: '2026-10-20',
    status: 'cancelled',
    items: [{ itemId: 'mock-item-1', quantity: '10.000' }],
  },
  {
    id: 'mock-request-3',
    number: 'REQ-0003',
    clinicId: MOCK_CLINIC_PHYSIO_ID,
    requestedOn: '2026-11-02',
    status: 'open',
    items: [{ itemId: 'mock-item-3', quantity: '8.000' }],
  },
];

/** Fake Requests module with three requests in two clinics. */
@Injectable()
export class MockRequestsAdapter implements RequestsAdapter {
  async listRequests(filter: { clinicId: string; status?: SupplyRequestStatus }) {
    return REQUESTS.filter(
      (r) => r.clinicId === filter.clinicId && (filter.status === undefined || r.status === filter.status),
    ).map((r) => structuredClone(r));
  }

  async getRequest(requestId: string) {
    const request = REQUESTS.find((r) => r.id === requestId);
    return request ? structuredClone(request) : null;
  }
}