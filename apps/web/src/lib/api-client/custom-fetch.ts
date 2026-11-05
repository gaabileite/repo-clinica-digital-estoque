/**
 * Mutator do Orval: todas as chamadas geradas passam por aqui.
 * TODO(ADR-002): enviar a credencial do usuário (cookie do shell ou token) e tratar 401.
 * Em desenvolvimento, os cabeçalhos x-dev-* simulam o usuário (a API só os aceita com DEV_AUTH_ENABLED=true).
 */
export class ApiError extends Error {
  constructor(public status: number, public problem?: unknown) {
    super(`HTTP ${status}`);
  }
}

export async function customFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (import.meta.env.DEV) {
    const dev = readDevSession();
    if (dev) {
      headers.set('x-dev-user', dev.userId);
      headers.set('x-dev-profile', dev.profile);
      headers.set('x-dev-clinics', dev.clinicIds.join(','));
    }
  }
  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  const body = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError(response.status, body);
  return { data: body, status: response.status, headers: response.headers } as T;
}

interface DevSession {
  userId: string;
  profile: 'superuser' | 'admin' | 'warehouse' | 'budget-controller';
  clinicIds: string[];
}

function readDevSession(): DevSession | null {
  try {
    const raw = localStorage.getItem('estoque-dev-session');
    return raw ? (JSON.parse(raw) as DevSession) : null;
  } catch {
    return null;
  }
}
