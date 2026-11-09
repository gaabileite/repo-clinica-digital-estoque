import { resolve } from 'node:path';
import { federation } from '@module-federation/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Remote do módulo "Estoque e insumos".
 * Contrato com o shell (apps/web/vite.config.ts do shell): remote `suppliesMfe`, entrada
 * http://localhost:5175/remoteEntry.js, módulo exposto `./App` (export nomeado `App`),
 * react e react-dom como singleton.
 */
// No Codespaces, o navegador acessa o módulo pela URL da porta encaminhada.
// A origem fixa em localhost continua valendo para a integração local com o shell.
const emCodespaces = Boolean(process.env.CODESPACE_NAME);

export default defineConfig({
  base: emCodespaces ? '/' : 'http://localhost:5175/',
  plugins: [
    tailwindcss(),
    react(),
    federation({
      name: 'suppliesMfe',
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App.tsx' },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
    }),
  ],
  resolve: { alias: { '@': resolve(import.meta.dirname, './src') } },
  build: { target: 'chrome89' },
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    cors: true,
    origin: emCodespaces ? undefined : 'http://localhost:5175',
    // O shell encaminha /api/v1/supplies para cá; daqui segue para a API do módulo (porta 3002).
    proxy: { '/api/v1': { target: process.env.API_BASE_URL || 'http://localhost:3002', changeOrigin: true } },
  },
  preview: { port: 5175, strictPort: true, cors: true },
});
