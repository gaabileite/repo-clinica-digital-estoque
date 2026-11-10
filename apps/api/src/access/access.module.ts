import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { APP_CONFIG, type AppConfig } from '../config/app.config';
import { AuthGuard } from './auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { createTokenVerifier, TokenVerifier } from './token-verifier';

@Module({
  providers: [
    // Built from the configuration: without IAM_ISSUER it accepts no token.
    { provide: TokenVerifier, useFactory: (config: AppConfig) => createTokenVerifier(config), inject: [APP_CONFIG] },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AccessModule {}