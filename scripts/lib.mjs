// Funções comuns dos scripts: versões, ambiente, portas e execução de comandos.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

// ---------- versões de Node e pnpm ----------
function getPnpmVersion() {
  const match = (process.env.npm_config_user_agent ?? '').match(/pnpm\/(\d+\.\d+\.\d+)/);
  if (match) return match[1];
  try {
    return execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('pnpm não foi encontrado. Execute `corepack enable` e instale a versão suportada do pnpm.');
  }
}

export function validateRuntime() {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < 24) {
    throw new Error(`Versão incompatível do Node.js: ${process.versions.node}. Use Node.js >= 24.x.`);
  }
  const pnpmVersion = getPnpmVersion();
  if (Number(pnpmVersion.split('.')[0]) !== 9) {
    throw new Error(`Versão incompatível do pnpm: ${pnpmVersion}. Use pnpm 9.x.`);
  }
  return { node: process.versions.node, pnpm: pnpmVersion };
}

// ---------- variáveis de ambiente (.env) ----------
const REQUIRED_KEYS = [
  'NODE_ENV', 'API_PORT', 'WEB_PORT', 'SHELL_BASE_URL',
  'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_PORT', 'DATABASE_URL',
];

export const rootDir = process.cwd();
export const envPath = path.join(rootDir, '.env');

export function parseEnvFile(filePath = envPath) {
  if (!fs.existsSync(filePath)) {
    throw new Error([
      'Arquivo .env não encontrado.',
      'Copie .env.example para .env antes de continuar.',
      'Exemplo: cp .env.example .env',
    ].join('\n'));
  }

  const env = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function loadEnv() {
  for (const [key, value] of Object.entries(parseEnvFile())) {
    if (!process.env[key]) process.env[key] = value;
  }
  return process.env;
}

export function validateEnv() {
  const env = loadEnv();
  const missing = REQUIRED_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error([
      'Variáveis obrigatórias ausentes no .env:',
      ...missing.map((key) => `- ${key}`),
      '',
      'Revise .env.example e preencha os valores necessários.',
    ].join('\n'));
  }

  for (const key of ['API_PORT', 'WEB_PORT', 'POSTGRES_PORT']) {
    const value = Number(env[key]);
    if (!Number.isInteger(value) || value <= 0 || value > 65535) {
      throw new Error(`Valor inválido para ${key}: ${env[key]}. Informe uma porta entre 1 e 65535.`);
    }
  }

  for (const key of ['POSTGRES_DB', 'POSTGRES_USER']) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(env[key])) {
      throw new Error(`Valor inválido para ${key}: ${env[key]}. Use apenas letras, números e underscore.`);
    }
  }

  const urlDefaults = {
    API_BASE_URL: `http://localhost:${env.API_PORT}`,
    WEB_BASE_URL: `http://localhost:${env.WEB_PORT}`,
  };
  for (const [key, fallback] of Object.entries(urlDefaults)) {
    if (!env[key]) {
      env[key] = fallback;
      process.env[key] = fallback;
    }
  }

  for (const key of ['API_BASE_URL', 'WEB_BASE_URL', 'SHELL_BASE_URL']) {
    try {
      const url = new URL(env[key]);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('scheme');
      if (env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('https');
    } catch {
      throw new Error(`Valor inválido para ${key}: ${env[key]}. Informe uma URL HTTP(S)${env.NODE_ENV === 'production' ? ' com HTTPS' : ''}.`);
    }
  }

  if (env.NODE_ENV === 'production' && env.DEV_AUTH_ENABLED === 'true') {
    throw new Error('DEV_AUTH_ENABLED=true não é permitido com NODE_ENV=production.');
  }

  return env;
}

// ---------- portas ----------
export function checkPortAvailable(port, label) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`A porta ${port} já está em uso para ${label}. Ajuste o valor no .env ou encerre o processo que está ocupando a porta.`));
        return;
      }
      reject(error);
    });
    server.once('listening', () => server.close(() => resolve()));
    server.listen(port, '0.0.0.0');
  });
}

// ---------- execução de comandos ----------
export function runCommand(command, args, options = {}) {
  const isWindows = process.platform === 'win32';
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: isWindows, ...options });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} ${args.join(' ')} falhou com código ${code ?? 'null'}${signal ? ` (signal ${signal})` : ''}.`));
    });
  });
}

export async function runStep(label, command, args, options = {}) {
  console.log(`→ ${label}`);
  await runCommand(command, args, options);
}

/** Roda `commands[name]` e sai com erro legível; usado pelos scripts que têm vários subcomandos. */
export async function dispatch(script, commands) {
  const name = process.argv[2];
  if (!commands[name]) {
    console.error(`Uso: node scripts/${script} <${Object.keys(commands).join('|')}>`);
    process.exit(1);
  }
  try {
    await commands[name]();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
