import { createLocalJWKSet, exportJWK, generateKeyPair, type JWK, type KeyLike, SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { TokenVerifier } from './token-verifier';

const ISSUER = 'https://iam.example/realms/clinic';
const AUDIENCE = 'estoque';
const nowInSeconds = () => Math.floor(Date.now() / 1000);

let privateKey: KeyLike;
let strangerPrivateKey: KeyLike; // a key the IAM never published
let verifier: TokenVerifier;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  strangerPrivateKey = (await generateKeyPair('RS256')).privateKey;
  const publicJwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  verifier = new TokenVerifier({ issuer: ISSUER, audience: AUDIENCE, getKey: createLocalJWKSet({ keys: [publicJwk] }) });
});

interface SignOptions {
  claims?: Record<string, unknown>;
  issuer?: string;
  audience?: string;
  expiresAt?: number;
  key?: KeyLike;
}

/** Signs a fake IAM token. By default it is a valid admin token. */
function sign({
  claims = { profile: 'admin', clinic_ids: ['clinic-1'] },
  issuer = ISSUER,
  audience = AUDIENCE,
  expiresAt = nowInSeconds() + 300,
  key,
}: SignOptions = {}): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject('user-1')
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key ?? privateKey);
}

describe('TokenVerifier', () => {
  it('accepts a valid token and builds the AuthContext', async () => {
    expect(await verifier.verify(await sign())).toEqual({
      userId: 'user-1',
      profile: 'admin',
      clinicIds: ['clinic-1'],
    });
  });

  it('rejects an expired token', async () => {
    expect(await verifier.verify(await sign({ expiresAt: nowInSeconds() - 60 }))).toBeUndefined();
  });

  it('rejects a token from another issuer', async () => {
    expect(await verifier.verify(await sign({ issuer: 'https://other.example/realms/x' }))).toBeUndefined();
  });

  it('rejects a token meant for another audience', async () => {
    expect(await verifier.verify(await sign({ audience: 'some-other-service' }))).toBeUndefined();
  });

  it('rejects a token signed with a key the IAM does not publish', async () => {
    expect(await verifier.verify(await sign({ key: strangerPrivateKey }))).toBeUndefined();
  });

  it('rejects an unsigned token (alg "none")', async () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'none' })}.${encode({
      sub: 'user-1',
      profile: 'superuser',
      iss: ISSUER,
      aud: AUDIENCE,
      exp: nowInSeconds() + 300,
    })}.`;
    expect(await verifier.verify(unsigned)).toBeUndefined();
  });

  it('rejects a correctly signed token whose claims are unusable', async () => {
    expect(await verifier.verify(await sign({ claims: { profile: 'manager', clinic_ids: [] } }))).toBeUndefined();
  });

  it('rejects garbage', async () => {
    expect(await verifier.verify('not-a-token')).toBeUndefined();
  });

  it('accepts nothing when the IAM is not configured', async () => {
    expect(await new TokenVerifier().verify(await sign())).toBeUndefined();
  });
});