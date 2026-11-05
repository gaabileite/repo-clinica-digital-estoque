import type { Profile } from './profile';

/** Quem está chamando. Preenchido pelo AuthGuard a partir do token do IAM (ADR-002). */
export interface AuthContext {
  userId: string;
  profile: Profile;
  /** Clínicas do usuário (claim `clinic_ids`). O superuser enxerga todas. */
  clinicIds: string[];
  /** Chave de visão orçamentária do superuser (RF-45). */
  budgetView?: boolean;
}
