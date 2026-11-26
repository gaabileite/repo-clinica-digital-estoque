import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    // Todos os arquivos usam o mesmo banco, e alguns (outbox) leem ou limpam tabelas inteiras. Em paralelo, um
    // arquivo que publica eventos faz o teste do outbox ver eventos que não são dele.
    fileParallelism: false,
    restoreMocks: true,
  },
});
