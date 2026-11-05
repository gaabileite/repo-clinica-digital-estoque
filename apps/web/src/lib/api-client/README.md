# Cliente da API (gerado)

`index.ts` e `models/` são gerados pelo Orval a partir do `openapi.json` da API:

```bash
pnpm api:generate   # gera o contrato e o cliente
pnpm api:check      # falha na CI se o cliente estiver desatualizado
```

Não edite os arquivos gerados. O `custom-fetch.ts` é manual.
