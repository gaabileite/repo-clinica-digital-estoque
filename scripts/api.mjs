// Contrato da API: `node scripts/api.mjs <generate|check>`.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dispatch } from './lib.mjs';

const rootDir = resolve(import.meta.dirname, '..');
const openapiPath = resolve(rootDir, 'openapi.json');
const clientDir = resolve(rootDir, 'apps/web/src/lib/api-client');

function generate() {
  console.log('[api:generate] 1/2 Construindo API e gerando openapi.json...');
  execSync('pnpm --dir apps/api build', { stdio: 'inherit', cwd: rootDir });
  execSync('node --env-file=.env apps/api/dist/generate-openapi.js', { stdio: 'inherit', cwd: rootDir });

  console.log('[api:generate] 2/2 Gerando cliente TypeScript via Orval...');
  execSync('npx orval --config orval.config.cjs', { stdio: 'inherit', cwd: rootDir });

  console.log('[api:generate] ✓ Contrato OpenAPI e cliente TypeScript gerados com sucesso!');
}

const hashOf = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function snapshotOf(dir) {
  const snapshots = new Map();
  if (!existsSync(dir)) return snapshots;
  const scan = (current) => {
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      if (statSync(fullPath).isDirectory()) scan(fullPath);
      else snapshots.set(fullPath, hashOf(fullPath));
    }
  };
  scan(dir);
  return snapshots;
}

function check() {
  console.log('[api:check] Coletando estado atual dos contratos e cliente gerado...');
  const initialOpenApi = existsSync(openapiPath) ? hashOf(openapiPath) : null;
  const initialClient = snapshotOf(clientDir);

  console.log('[api:check] Executando geração do contrato e cliente...');
  generate();

  const newOpenApi = existsSync(openapiPath) ? hashOf(openapiPath) : null;
  const newClient = snapshotOf(clientDir);
  const differences = [];

  if (initialOpenApi !== newOpenApi) differences.push('openapi.json (especificação OpenAPI desatualizada)');
  for (const [file, hash] of newClient) {
    if (initialClient.get(file) !== hash) differences.push(`${file} (alterado ou novo)`);
  }
  for (const file of initialClient.keys()) {
    if (!newClient.has(file)) differences.push(`${file} (removido)`);
  }

  if (differences.length > 0) {
    console.error('\n❌ [api:check] FALHA: Foi detectada divergência entre a API e o cliente gerado:');
    for (const diff of differences) console.error(` - ${diff}`);
    console.error('\nExecute `pnpm api:generate` localmente e comite as alterações antes de enviar para a CI.\n');
    process.exit(1);
  }
  console.log('\n✓ [api:check] SUCESSO: Contrato OpenAPI e cliente gerado estão 100% sincronizados!\n');
}

await dispatch('api.mjs', { generate, check });
