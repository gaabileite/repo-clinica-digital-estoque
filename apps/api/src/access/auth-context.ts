import type { Profile } from './profile';

/** Quem está chamando. Preenchido pelo AuthGuard a partir das claims do token do IAM. */
export interface AuthContext {
  userId: string;
  profile: Profile;
  /** Clínicas do usuário (claim `clinic_ids`). O superuser enxerga todas. */
  clinicIds: string[];
  /** Chave de visão orçamentária do superuser (RF-45). */
  budgetView?: boolean;
}
