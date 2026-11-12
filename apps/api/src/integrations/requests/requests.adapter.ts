export const REQUESTS_ADAPTER = Symbol('REQUESTS_ADAPTER');

export type SupplyRequestStatus = 'open' | 'approved' | 'cancelled';

export interface SupplyRequestItem {
  /** Requests reference items by id (contract decision D3). */
  itemId: string;
  /** Decimal string, like every quantity in the API (e.g. "20.000"). */
  quantity: string;
}

/** A supply request, with the minimum fields the Stock module needs (requirement RF-21). */
export interface SupplyRequest {
  id: string;
  number: string;
  clinicId: string;
  /** Civil date of the request (YYYY-MM-DD). */
  requestedOn: string;
  status: SupplyRequestStatus;
  items: SupplyRequestItem[];
}

export interface RequestsAdapter {
  /** D-10: requests of one clinic, optionally filtered by status (the Stock module asks for 'open'). */
  listRequests(filter: { clinicId: string; status?: SupplyRequestStatus }): Promise<SupplyRequest[]>;

  /** D-11: one request with its items, or null when the id does not exist. */
  getRequest(requestId: string): Promise<SupplyRequest | null>;
}