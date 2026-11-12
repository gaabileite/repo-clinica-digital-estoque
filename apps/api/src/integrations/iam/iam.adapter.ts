import type { Profile } from '../../access/profile';

export const IAM_ADAPTER = Symbol('IAM_ADAPTER');

/** A user as the IAM module describes it. */
export interface IamUser {
  id: string;
  name: string;
  profile: Profile;
  /** Clinics the user belongs to. The superuser has none (and sees every clinic). */
  clinicIds: string[];
  active: boolean;
}

export interface ListUsersFilter {
  clinicId?: string;
  profile?: Profile;
  /** When true, inactive users are left out. */
  activeOnly?: boolean;
}

export interface IamAdapter {
  /** D-03: one user, or null when the id does not exist. */
  getUser(userId: string): Promise<IamUser | null>;

  /** D-04: users filtered by clinic, profile and status (used to find alert recipients). */
  listUsers(filter?: ListUsersFilter): Promise<IamUser[]>;

  /** D-05: several users at once (at most 100 ids). Unknown ids are simply left out. */
  getUsers(userIds: string[]): Promise<IamUser[]>;
}