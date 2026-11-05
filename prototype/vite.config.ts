import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Remote do módulo "Estoque e insumos".
 *
 * Contrato com o shell (apps/web/vite.config.ts e src/module-federation.d.ts):
 *  - nome do remote: suppliesMfe
 *  - entrada: http://localhost:5175/remoteEntry.js  (porta reservada em docs/module-catalog.md)
 *  - módulo exposto: ./App  ->  export nomeado `App` (componente React sem props obrigatórias)
 *  - react e react-dom como singleton, iguais aos do shell
 */
export default defineConfig({
  base: 'http://localhost:5175/',
  plugins: [
    react(),
    federation({
      name: 'suppliesMfe',
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App.tsx' },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
  build: { target: 'chrome89' },
  server: { port: 5175, strictPort: true, cors: true, origin: 'http://localhost:5175' },
  preview: { port: 5175, strictPort: true, cors: true },
});
