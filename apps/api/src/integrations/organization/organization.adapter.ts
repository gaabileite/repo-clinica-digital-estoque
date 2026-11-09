export const ORGANIZATION_ADAPTER = Symbol('ORGANIZATION_ADAPTER');

/** A clinic as the Organization module describes it. */
export interface OrgClinic {
  id: string;
  name: string;
  address: string;
  manager: string;
  active: boolean;
}

export interface OrganizationAdapter {
  /** D-06: every active clinic of the network (used by the superuser). */
  listActiveClinics(): Promise<OrgClinic[]>;

  /** D-07: one clinic (active or not), or null when the id does not exist. */
  getClinic(clinicId: string): Promise<OrgClinic | null>;
}