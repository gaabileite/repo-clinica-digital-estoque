export const APP_CONFIG = Symbol('APP_CONFIG');

export interface AppConfig {
  nodeEnv: string;
  apiPort: number;
  apiBaseUrl: string;
  webBaseUrl: string;
  shellBaseUrl: string;
  /** Autenticação por cabeçalhos, só para desenvolvimento local. Ver docs/architecture.md. */
  devAuthEnabled: boolean;
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const apiPort = Number(env.API_PORT ?? 3002);
  const devAuthEnabled = env.DEV_AUTH_ENABLED === 'true';

  if (nodeEnv === 'production' && devAuthEnabled) {
    throw new Error('DEV_AUTH_ENABLED=true não é permitido em produção.');
  }

  return {
    nodeEnv,
    apiPort,
    apiBaseUrl: env.API_BASE_URL ?? `http://localhost:${apiPort}`,
    webBaseUrl: env.WEB_BASE_URL ?? `http://localhost:${env.WEB_PORT ?? 5175}`,
    shellBaseUrl: env.SHELL_BASE_URL ?? 'http://localhost:5173',
    devAuthEnabled,
  };
}
