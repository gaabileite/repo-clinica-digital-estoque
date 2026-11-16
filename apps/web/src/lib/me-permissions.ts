import { permissionsControllerMine } from './api-client';

// Tipo provisório até o OpenAPI descrever a resposta de E-50.
export interface MePermissions {
  profile: string;
  permissions: string[];
  clinics: string[];
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string');
}

export async function getMePermissions(signal: AbortSignal): Promise<MePermissions> {
  const response = await permissionsControllerMine({ signal });
  const data: unknown = response.data;

  if (
    typeof data !== 'object' ||
    data === null ||
    !('profile' in data) ||
    typeof data.profile !== 'string' ||
    !('permissions' in data) ||
    !isStringList(data.permissions) ||
    !('clinics' in data) ||
    !isStringList(data.clinics)
  ) {
    throw new Error('Resposta inválida ao consultar permissões');
  }

  return { profile: data.profile, permissions: data.permissions, clinics: data.clinics };
}
