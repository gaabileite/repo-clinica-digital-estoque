import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthContext } from './auth-context';
import type { Permission } from './permissions';
import type { Profile } from './profile';

export const IS_PUBLIC_KEY = 'estoque:is-public';
export const REQUIRED_PERMISSIONS_KEY = 'estoque:required-permissions';
export const REQUIRED_PROFILE_KEY = 'estoque:required-profile';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
export const RequireProfile = (profile: Profile) => SetMetadata(REQUIRED_PROFILE_KEY, profile);

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext | undefined =>
    context.switchToHttp().getRequest().auth,
);
