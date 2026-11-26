import { RequestMethod } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IS_PUBLIC_KEY, REQUIRED_PERMISSIONS_KEY } from '../src/access/access.decorators';
import { AppModule } from '../src/app.module';
import { IDEMPOTENT_KEY } from '../src/common/idempotency/idempotency';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Security review by code (RNF-05, contract section 2). It lists every route of the API and checks:
 * 1. every route asks for a permission, except the ones listed in OPEN_TO_ANY_LOGGED_USER and PUBLIC;
 * 2. the public routes are only the health checks;
 * 3. every POST that changes the balance requires the Idempotency-Key.
 * A new route that breaks a rule fails here, with its name. Fix the route; only add it to a list below
 * when it is really an exception, and write why.
 */

/** Needs a login, but no scope: it only returns the data of the caller. */
const OPEN_TO_ANY_LOGGED_USER = ['GET me/permissions'];

/** No login at all. */
const PUBLIC = ['GET health/live', 'GET health/ready'];

/** POSTs that change the balance and must require the Idempotency-Key (contract section 2). */
const MUST_BE_IDEMPOTENT = [
  'POST clinics/:clinicId/withdrawals',
  'POST clinics/:clinicId/expired-lots/write-off',
  'POST clinics/:clinicId/procedure-consumptions',
  'POST clinics/:clinicId/pending-consumptions/:pendingId/confirmation',
  'POST clinics/:clinicId/returns',
  'POST clinics/:clinicId/movements/:movementId/reversals',
  'POST clinics/:clinicId/lots/:lotId/adjustments',
  'POST clinics/:clinicId/receipts',
  'POST clinics/:clinicId/receipts/:receiptId/reversals',
  'POST clinics/:clinicId/incorrect-receipts/:id/incorporation',
];

/** POSTs of the operational scopes that do NOT change the balance, so they do not need the key. */
const NOT_IDEMPOTENT_OK = [
  'POST clinics/:clinicId/procedure-consumptions/preview',
  'POST clinics/:clinicId/pending-consumptions/:pendingId/dismissal',
  'POST clinics/:clinicId/incorrect-receipts',
  'POST clinics/:clinicId/incorrect-receipts/:id/exchange',
  'POST clinics/:clinicId/incorrect-receipts/:id/disposal',
];

const BALANCE_SCOPES = ['stock:withdraw', 'stock:receive', 'stock:adjust', 'stock:reverse'];

interface Route {
  key: string;
  permissions: string[];
  isPublic: boolean;
  idempotent: boolean;
}

const firstPath = (value: unknown): string => {
  const path = Array.isArray(value) ? value[0] : value;
  return typeof path === 'string' ? path.replace(/^\/+|\/+$/g, '') : '';
};

function collectRoutes(controllers: Array<{ metatype: unknown }>): Route[] {
  const routes: Route[] = [];
  for (const { metatype } of controllers) {
    if (typeof metatype !== 'function') continue;
    const controller = metatype as object & { prototype: Record<string, object> };
    const prefix = firstPath(Reflect.getMetadata('path', controller));
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      if (name === 'constructor') continue;
      const handler = controller.prototype[name];
      const methodCode = Reflect.getMetadata('method', handler) as number | undefined;
      if (methodCode === undefined) continue; // not a route
      const path = [prefix, firstPath(Reflect.getMetadata('path', handler))].filter(Boolean).join('/');
      const meta = <T>(key: string): T | undefined =>
        (Reflect.getMetadata(key, handler) ?? Reflect.getMetadata(key, controller)) as T | undefined;
      routes.push({
        key: `${RequestMethod[methodCode]} ${path}`,
        permissions: meta<string[]>(REQUIRED_PERMISSIONS_KEY) ?? [],
        isPublic: meta<boolean>(IS_PUBLIC_KEY) === true,
        idempotent: meta<boolean>(IDEMPOTENT_KEY) === true,
      });
    }
  }
  return routes;
}

describe('route security (e2e, no database needed)', () => {
  let routes: Route[] = [];
  let close: () => Promise<void>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule, DiscoveryModule] })
      .overrideProvider(PrismaService)
      .useValue({ rolePermission: { findMany: async () => [] } })
      .compile();
    routes = collectRoutes(moduleRef.get(DiscoveryService, { strict: false }).getControllers());
    close = () => moduleRef.close();
  });

  afterAll(async () => {
    await close();
  });

  it('found the routes of the API', () => {
    expect(routes.length).toBeGreaterThan(60);
  });

  it('every route asks for a permission (or is one of the listed exceptions)', () => {
    const unprotected = routes
      .filter((r) => r.permissions.length === 0 && !r.isPublic && !OPEN_TO_ANY_LOGGED_USER.includes(r.key))
      .map((r) => r.key);
    expect(unprotected).toEqual([]);
  });

  it('the only public routes are the health checks', () => {
    expect(routes.filter((r) => r.isPublic).map((r) => r.key).sort()).toEqual([...PUBLIC].sort());
  });

  it('the exceptions listed above still exist (a stale entry hides a real problem)', () => {
    const keys = routes.map((r) => r.key);
    for (const entry of [...OPEN_TO_ANY_LOGGED_USER, ...PUBLIC, ...MUST_BE_IDEMPOTENT, ...NOT_IDEMPOTENT_OK]) {
      expect(keys, `route not found: ${entry}`).toContain(entry);
    }
  });

  it('every POST that changes the balance requires the Idempotency-Key', () => {
    const missing = MUST_BE_IDEMPOTENT.filter((key) => !routes.find((r) => r.key === key)?.idempotent);
    expect(missing).toEqual([]);
  });

  it('a new POST of the operational scopes needs the key, unless it is listed as not changing the balance', () => {
    const suspicious = routes
      .filter((r) => r.key.startsWith('POST ') && r.permissions.some((p) => BALANCE_SCOPES.includes(p)))
      .filter((r) => !r.idempotent && !NOT_IDEMPOTENT_OK.includes(r.key))
      .map((r) => r.key);
    expect(suspicious).toEqual([]);
  });
});