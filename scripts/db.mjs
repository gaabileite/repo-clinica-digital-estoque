// Banco do módulo: `node scripts/db.mjs <setup|up|down|migrate|seed|studio|check|deploy>`.
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { dispatch, runStep, validateEnv, validateRuntime } from './lib.mjs';

const prisma = (...args) => ['--dir', 'apps/api', 'exec', 'prisma', ...args, '--schema', 'prisma/schema.prisma'];

function ensureDockerAvailable() {
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore' });
  } catch {
    throw new Error([
      'Docker não está disponível.',
      'Verifique se o Docker Desktop/daemon está em execução e se sua conta possui permissão para usar Docker.',
    ].join('\n'));
  }
}

const commands = {
  /** Prepara tudo de uma vez: versões, banco, migrations e seed. */
  async setup() {
    validateRuntime();
    validateEnv();
    await commands.up();
    await commands.migrate();
    await commands.seed();
    console.log('Setup concluído. Banco do módulo, migrations e seed prontos.');
  },

  /** Sobe o PostgreSQL local (porta 5434). */
  async up() {
    validateEnv();
    ensureDockerAvailable();
    await runStep('Subindo PostgreSQL com Docker Compose', 'docker', ['compose', 'up', '-d', '--wait', 'postgres']);
    console.log('PostgreSQL pronto para uso.');
  },

  /** Para o PostgreSQL sem apagar o volume. */
  async down() {
    ensureDockerAvailable();
    await runStep('Parando PostgreSQL sem remover o volume', 'docker', ['compose', 'stop', 'postgres']);
    console.log('PostgreSQL parado.');
  },

  /** Aplica as migrations no banco local. */
  async migrate() {
    validateEnv();
    await runStep('Aplicando migrations Prisma', 'pnpm', [...prisma('migrate', 'deploy')]);
    console.log('Migrations aplicadas.');
  },

  /** Seed de desenvolvimento. */
  async seed() {
    validateEnv();
    await runStep('Executando seed de desenvolvimento', 'pnpm', ['--dir', 'apps/api', 'exec', 'node', 'prisma/seed.mjs']);
    console.log('Seed concluído.');
  },

  /** Abre o Prisma Studio. */
  async studio() {
    validateEnv();
    await runStep('Abrindo Prisma Studio', 'pnpm', [...prisma('studio')]);
  },

  /** Confere (CI) que o schema.prisma e as migrations estão sincronizados, usando um banco `_shadow`. */
  check() {
    const rootDir = process.cwd();
    const apiDir = path.join(rootDir, 'apps', 'api');
    const schemaPath = path.join(apiDir, 'prisma', 'schema.prisma');
    const migrationsPath = path.join(apiDir, 'prisma', 'migrations');
    const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

    if (!shadowDatabaseUrl) {
      throw new Error([
        'SHADOW_DATABASE_URL é obrigatória para validar migrations.',
        'Use um banco PostgreSQL temporário e exclusivo, cujo nome termine com `_shadow`.',
        'Nunca aponte esta variável para um banco com dados reais.',
      ].join('\n'));
    }

    let shadowUrl;
    try {
      shadowUrl = new URL(shadowDatabaseUrl);
    } catch {
      throw new Error('SHADOW_DATABASE_URL deve ser uma URL PostgreSQL válida.');
    }
    const databaseName = decodeURIComponent(shadowUrl.pathname.replace(/^\//, ''));
    if (!['postgres:', 'postgresql:'].includes(shadowUrl.protocol) || !databaseName.endsWith('_shadow')) {
      throw new Error('SHADOW_DATABASE_URL deve apontar para um banco PostgreSQL exclusivo cujo nome termine com `_shadow`.');
    }

    const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL || shadowDatabaseUrl };
    const runPrisma = (args) =>
      spawnSync('pnpm', ['--dir', apiDir, 'exec', 'prisma', ...args], { cwd: rootDir, env, encoding: 'utf8' });
    const show = (result) => {
      process.stdout.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
    };

    const validation = runPrisma(['validate', '--schema', schemaPath]);
    show(validation);
    if (validation.status !== 0) process.exit(validation.status ?? 1);

    const diff = runPrisma([
      'migrate', 'diff',
      '--from-migrations', migrationsPath,
      '--to-schema-datamodel', schemaPath,
      '--shadow-database-url', shadowDatabaseUrl,
      '--exit-code',
    ]);
    show(diff);
    if (diff.status === 2) {
      throw new Error([
        'O schema Prisma não corresponde às migrations versionadas.',
        'Gere e versione uma migration para a alteração estrutural antes de enviar a mudança.',
      ].join('\n'));
    }
    if (diff.status !== 0) process.exit(diff.status ?? 1);
    console.log('Schema Prisma e migrations estão sincronizados.');
  },

  /** Aplica as migrations em produção. */
  async deploy() {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error('db:deploy exige NODE_ENV=production para evitar uso acidental no desenvolvimento.');
    }
    const value = process.env.DATABASE_URL;
    if (!value) throw new Error('DATABASE_URL é obrigatória para aplicar migrations de produção.');
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error('DATABASE_URL deve ser uma URL PostgreSQL válida.');
    }
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      throw new Error('DATABASE_URL deve usar o protocolo postgresql:// ou postgres://.');
    }
    await runStep('Aplicando migrations de produção com prisma migrate deploy', 'pnpm', [...prisma('migrate', 'deploy')]);
    console.log('Migrations de produção aplicadas com sucesso.');
  },
};

await dispatch('db.mjs', commands);
