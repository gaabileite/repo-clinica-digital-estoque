import { describe, expect, it } from 'vitest';
import { loadAppConfig } from './app.config';

describe('loadAppConfig (IAM settings)', () => {
  it('leaves the IAM settings empty when nothing is configured', () => {
    const config = loadAppConfig({ NODE_ENV: 'development' });
    expect(config.iamIssuer).toBeUndefined();
    expect(config.iamAudience).toBeUndefined();
    expect(config.iamJwksUrl).toBeUndefined();
  });

  it('derives the keys URL from the issuer, ignoring a trailing slash', () => {
    const config = loadAppConfig({ IAM_ISSUER: 'https://iam.example/realms/clinic/' });
    expect(config.iamIssuer).toBe('https://iam.example/realms/clinic');
    expect(config.iamJwksUrl).toBe('https://iam.example/realms/clinic/protocol/openid-connect/certs');
  });

  it('lets IAM_JWKS_URL override the derived URL', () => {
    const config = loadAppConfig({
      IAM_ISSUER: 'https://iam.example/realms/clinic',
      IAM_JWKS_URL: 'https://keys.example/jwks',
    });
    expect(config.iamJwksUrl).toBe('https://keys.example/jwks');
  });

  it('treats a blank variable as not set', () => {
    expect(loadAppConfig({ IAM_ISSUER: '   ' }).iamIssuer).toBeUndefined();
  });

  it('refuses to start in production without an issuer', () => {
    expect(() => loadAppConfig({ NODE_ENV: 'production' })).toThrow(/IAM_ISSUER/);
  });

  it('refuses to start in production without an audience', () => {
    expect(() =>
      loadAppConfig({ NODE_ENV: 'production', IAM_ISSUER: 'https://iam.example/realms/clinic' }),
    ).toThrow(/IAM_AUDIENCE/);
  });

  it('still refuses dev auth in production', () => {
    expect(() =>
      loadAppConfig({
        NODE_ENV: 'production',
        DEV_AUTH_ENABLED: 'true',
        IAM_ISSUER: 'https://iam.example/realms/clinic',
        IAM_AUDIENCE: 'estoque',
      }),
    ).toThrow(/DEV_AUTH_ENABLED/);
  });
});