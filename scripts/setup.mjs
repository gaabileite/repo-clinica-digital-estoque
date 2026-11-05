import { validateRuntime } from './lib/runtime.mjs';
import { validateEnv } from './lib/env.mjs';
import { runCommand } from './lib/process.mjs';

try {
  validateRuntime();
  validateEnv();

  await runCommand('node', ['scripts/db-up.mjs']);
  await runCommand('node', ['scripts/db-migrate.mjs']);
  await runCommand('node', ['scripts/db-seed.mjs']);

  console.log('Setup concluído. Banco do módulo, migrations e seed prontos.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
