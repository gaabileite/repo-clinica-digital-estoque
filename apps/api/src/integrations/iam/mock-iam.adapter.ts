import { Injectable } from '@nestjs/common';
import { MOCK_CLINIC_DENTISTRY_ID, MOCK_CLINIC_PHYSIO_ID } from '../mock-ids';
import type { IamAdapter, IamUser, ListUsersFilter } from './iam.adapter';

const USERS: IamUser[] = [
  { id: 'mock-superuser', name: 'Mock Superuser', profile: 'superuser', clinicIds: [], active: true },
  { id: 'mock-admin-dentistry', name: 'Mock Admin (Dentistry)', profile: 'admin', clinicIds: [MOCK_CLINIC_DENTISTRY_ID], active: true },
  { id: 'mock-warehouse-dentistry', name: 'Mock Warehouse (Dentistry)', profile: 'warehouse', clinicIds: [MOCK_CLINIC_DENTISTRY_ID], active: true },
  { id: 'mock-budget-dentistry', name: 'Mock Budget Controller (Dentistry)', profile: 'budget-controller', clinicIds: [MOCK_CLINIC_DENTISTRY_ID], active: true },
  { id: 'mock-admin-physio', name: 'Mock Admin (Physio)', profile: 'admin', clinicIds: [MOCK_CLINIC_PHYSIO_ID], active: true },
  { id: 'mock-former-warehouse-dentistry', name: 'Mock Former Warehouse (Dentistry)', profile: 'warehouse', clinicIds: [MOCK_CLINIC_DENTISTRY_ID], active: false },
];

/** Returns a copy, so a caller that edits the result cannot change the fake data. */
const copy = (user: IamUser): IamUser => structuredClone(user);

/** Fake IAM module with a small fixed list of users. */
@Injectable()
export class MockIamAdapter implements IamAdapter {
  async getUser(userId: string) {
    const user = USERS.find((u) => u.id === userId);
    return user ? copy(user) : null;
  }

  async listUsers(filter: ListUsersFilter = {}) {
    return USERS.filter(
      (u) =>
        (filter.clinicId === undefined || u.clinicIds.includes(filter.clinicId)) &&
        (filter.profile === undefined || u.profile === filter.profile) &&
        (!filter.activeOnly || u.active),
    ).map(copy);
  }

  async getUsers(userIds: string[]) {
    if (userIds.length > 100) throw new RangeError('IAM batch-get accepts at most 100 ids (contract D-05).');
    return USERS.filter((u) => userIds.includes(u.id)).map(copy);
  }
}