import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isMonetaryName } from './monetary-fields';

/**
 * RNF-05 / RN-15: money only leaves through the budget routes. This reads the contract (openapi.json, which the
 * CI keeps in sync with the code) and fails if an operational route declares a monetary-looking field.
 * If a field is legitimate (for example, it is only filled for who has the budget scope, and the real
 * test in test/no-monetary-values.e2e-spec.ts proves it), add "SchemaName.field" below, with the reason.
 */
const ALLOWED: string[] = [];

interface Schema {
  $ref?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  additionalProperties?: Schema | boolean;
}
interface Operation {
  tags?: string[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
  responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
}
interface Spec {
  paths: Record<string, Record<string, Operation>>;
  components?: { schemas?: Record<string, Schema> };
}

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, 'openapi.json'))) return dir;
    dir = dirname(dir);
  }
  throw new Error('openapi.json not found: run the tests from the repository.');
}

const spec = JSON.parse(readFileSync(join(findRepoRoot(), 'openapi.json'), 'utf8')) as Spec;

/** Every monetary-looking property reachable from a schema, as "SchemaName.property". */
function scan(schema: Schema | undefined, trail: string, seen: Set<string>, found: string[]): void {
  if (!schema) return;
  if (schema.$ref) {
    const name = schema.$ref.replace('#/components/schemas/', '');
    if (seen.has(name)) return;
    seen.add(name);
    scan(spec.components?.schemas?.[name], name, seen, found);
    return;
  }
  for (const [property, child] of Object.entries(schema.properties ?? {})) {
    if (isMonetaryName(property) && !ALLOWED.includes(`${trail}.${property}`)) found.push(`${trail}.${property}`);
    scan(child, `${trail}.${property}`, seen, found);
  }
  scan(schema.items, trail, seen, found);
  for (const part of [...(schema.allOf ?? []), ...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]) scan(part, trail, seen, found);
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    scan(schema.additionalProperties, trail, seen, found);
  }
}

describe('RNF-05: no monetary field outside the budget routes (contract)', () => {
  const violations: string[] = [];
  let scanned = 0;
  let exempt = 0;

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (operation.tags?.includes('budget')) {
        exempt += 1;
        continue;
      }
      scanned += 1;
      const schemas: Array<Schema | undefined> = [
        ...Object.values(operation.requestBody?.content ?? {}).map((media) => media.schema),
        ...Object.values(operation.responses ?? {}).flatMap((response) => Object.values(response.content ?? {}).map((media) => media.schema)),
      ];
      const found: string[] = [];
      const seen = new Set<string>();
      for (const schema of schemas) scan(schema, `${method.toUpperCase()} ${path}`, seen, found);
      violations.push(...found.map((entry) => `${method.toUpperCase()} ${path} -> ${entry}`));
    }
  }

  it('looked at the operational routes and found the budget ones to skip', () => {
    expect(scanned).toBeGreaterThan(30);
    expect(exempt).toBeGreaterThan(0);
  });

  it('no operational route declares a field that looks like money', () => {
    expect(violations).toEqual([]);
  });
});