export const CARE_ADAPTER = Symbol('CARE_ADAPTER');

/** A clinical procedure from the Care catalog. */
export interface CareProcedure {
  id: string;
  clinicId: string;
  name: string;
}

/** One time a procedure was performed on a patient. */
export interface CareProcedureExecution {
  id: string;
  clinicId: string;
  procedureId: string;
  status: 'completed' | 'cancelled';
  /** ISO 8601 instant (UTC). */
  occurredAt: string;
}

export interface CareAdapter {
  /** D-08: procedure catalog of one clinic (used to link a package to a procedure). */
  listProcedures(clinicId: string): Promise<CareProcedure[]>;

  /** D-09: one execution, or null when the id does not exist. */
  getProcedureExecution(executionId: string): Promise<CareProcedureExecution | null>;
}