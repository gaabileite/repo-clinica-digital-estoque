import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { AppConfig } from '../config/app.config';
import type { AuthContext } from './auth-context';
import { authContextFromClaims } from './token-claims';

/**
 * Only asymmetric algorithms: the IAM signs with its private key and we check with its public one.
 * Keycloak uses RS256 by default. Never add 'none' or an HS* algorithm here.
 */
const ACCEPTED_ALGORITHMS = ['RS256'];

export interface TokenVerifierOptions {
  /** Who must have signed the token (`iss` claim). */
  issuer: string;
  /** Who the token must be meant for (`aud` claim). Not checked when undefined. */
  audience?: string;
  /** Finds the public key that matches the token header (the IAM key set). */
  getKey: JWTVerifyGetKey;
}

/**
 * Checks an IAM access token (signature, issuer, audience, expiry) and turns its claims
 * into the AuthContext. Without options (IAM not configured) it accepts nothing.
 */
export class TokenVerifier {
  constructor(private readonly options?: TokenVerifierOptions) {}

  async verify(token: string): Promise<AuthContext | undefined> {
    if (!this.options) return undefined;
    try {
      const { payload } = await jwtVerify(token, this.options.getKey, {
        issuer: this.options.issuer,
        audience: this.options.audience,
        algorithms: ACCEPTED_ALGORITHMS,
        clockTolerance: 5, // seconds of difference allowed between the two clocks
      });
      return authContextFromClaims(payload);
    } catch {
      // Bad signature, expired, wrong issuer or audience, malformed token... all mean "not authenticated".
      return undefined;
    }
  }
}

/** Builds the verifier from the configuration. The keys are downloaded on first use and cached by jose. */
export function createTokenVerifier(config: AppConfig): TokenVerifier {
  if (!config.iamIssuer || !config.iamJwksUrl) return new TokenVerifier();
  return new TokenVerifier({
    issuer: config.iamIssuer,
    audience: config.iamAudience,
    getKey: createRemoteJWKSet(new URL(config.iamJwksUrl)),
  });
}