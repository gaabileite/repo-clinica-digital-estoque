import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { APP_CONFIG, type AppConfig } from '../config/app.config';
import { AuthGuard } from './auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { createTokenVerifier, TokenVerifier } from './token-verifier';
import { UserCacheService } from './user-cache.service';

/** Global (like PrismaModule) so the events module can use UserCacheService without importing this one. */
@Global()
@Module({
  providers: [
    // Built from the configuration: without IAM_ISSUER it accepts no token.
    { provide: TokenVerifier, useFactory: (config: AppConfig) => createTokenVerifier(config), inject: [APP_CONFIG] },
    UserCacheService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [UserCacheService],
})
export class AccessModule {}