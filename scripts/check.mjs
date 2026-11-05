// Verificações de ambiente: `node scripts/check.mjs runtime` ou `env`.
import { dispatch, validateEnv, validateRuntime } from './lib.mjs';

await dispatch('check.mjs', {
  runtime() {
    const versions = validateRuntime();
    console.log(`Runtime válido: Node.js ${versions.node} / pnpm ${versions.pnpm}`);
  },
  env() {
    validateEnv();
    console.log('Arquivo .env válido.');
  },
});
