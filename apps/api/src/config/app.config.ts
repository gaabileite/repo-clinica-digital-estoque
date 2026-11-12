export const APP_CONFIG = Symbol('APP_CONFIG');

export interface AppConfig {
  nodeEnv: string;
  apiPort: number;
  apiBaseUrl: string;
  webBaseUrl: string;
  shellBaseUrl: string;
  /** Autenticação por cabeçalhos, só para desenvolvimento local. Ver docs/architecture.md. */
  devAuthEnabled: boolean;
  /** Liga o despachante do outbox (decisão D6). Desligue em processos que só leem. */
  outboxDispatchEnabled: boolean;
  outboxIntervalMs: number;
  // NEW: IAM token validation (E0-H4). Optional in development, required in production.
  /** Who must have signed the token, e.g. https://host/realms/<realm> (Keycloak). */
  iamIssuer?: string;
  /** Who the token must be meant for (the `aud` claim). */
  iamAudience?: string;
  /** Where the IAM public keys are. Derived from the issuer unless IAM_JWKS_URL says otherwise. */
  iamJwksUrl?: string;
}

// NEW: an empty or blank environment variable counts as "not set".
const optional = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const apiPort = Number(env.API_PORT ?? 3002);
  const devAuthEnabled = env.DEV_AUTH_ENABLED === 'true';

  if (nodeEnv === 'production' && devAuthEnabled) {
    throw new Error('DEV_AUTH_ENABLED=true não é permitido em produção.');
  }

  // NEW: read the IAM settings (the trailing slash is removed so URLs are built consistently).
  const iamIssuer = optional(env.IAM_ISSUER)?.replace(/\/+$/, '');
  const iamAudience = optional(env.IAM_AUDIENCE);
  if (nodeEnv === 'production' && !iamIssuer) {
    throw new Error('IAM_ISSUER é obrigatório em produção (sem ele ninguém consegue se autenticar).');
  }
  if (nodeEnv === 'production' && !iamAudience) {
    throw new Error('IAM_AUDIENCE é obrigatório em produção (sem ele qualquer token do IAM valeria para este módulo).');
  }
  // Keycloak publishes its public keys at <issuer>/protocol/openid-connect/certs.
  const iamJwksUrl =
    optional(env.IAM_JWKS_URL) ?? (iamIssuer ? `${iamIssuer}/protocol/openid-connect/certs` : undefined);

  return {
    nodeEnv,
    apiPort,
    apiBaseUrl: env.API_BASE_URL ?? `http://localhost:${apiPort}`,
    webBaseUrl: env.WEB_BASE_URL ?? `http://localhost:${env.WEB_PORT ?? 5175}`,
    shellBaseUrl: env.SHELL_BASE_URL ?? 'http://localhost:5173',
    devAuthEnabled,
    outboxDispatchEnabled: env.OUTBOX_DISPATCH_ENABLED !== 'false',
    outboxIntervalMs: Number(env.OUTBOX_INTERVAL_MS ?? 5000),
    iamIssuer,
    iamAudience,
    iamJwksUrl,
  };
}