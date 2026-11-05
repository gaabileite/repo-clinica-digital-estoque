import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthContext } from './auth-context';
import type { Permission } from './permissions';

export const IS_PUBLIC_KEY = 'estoque:is-public';
export const REQUIRED_PERMISSIONS_KEY = 'estoque:required-permissions';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext | undefined =>
    context.switchToHttp().getRequest().auth,
);
