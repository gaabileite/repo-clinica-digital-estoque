# Estoque e insumos (Clínica Digital UFPE)

Módulo de controle de estoque e insumos da Clínica Digital UFPE (NUTES × CIn/UFPE): micro frontend (`suppliesMfe`) e API próprios, integrados ao shell da plataforma.

Estado: requisitos v2.1 e contrato de APIs v0.12 com as decisões em aberto fechadas; esqueleto do código pronto, sem as funcionalidades. Ver `docs/`.

## O que há aqui

| Pasta | Conteúdo |
| --- | --- |
| `docs/` | Requisitos, contrato de APIs, backlog, planejamento de sprints, arquitetura e decisões (ADR) |
| `apps/api/` | API NestJS + Prisma: módulos por funcionalidade, regras de negócio puras em `src/domain/`, esquema do banco |
| `apps/web/` | Micro frontend React (remote `suppliesMfe`, expõe `./App`): uma pasta por tela em `src/features/` |
| `prototype/` | Protótipo clicável validado, só como referência de interface e comportamento |
| `scripts/` | Banco, geração do contrato e do cliente, verificação de ambiente |
| `openapi.json` | Contrato gerado pela API (não editar à mão) |

## Como rodar

Requisitos: Node 24 e pnpm 9 (`corepack enable`) e Docker (só para o banco local).

```bash
pnpm install
cp .env.example .env
pnpm db:up        # PostgreSQL na porta 5434
pnpm db:migrate   # aplica as migrations
pnpm db:seed      # parâmetros padrão e clínicas de demonstração
pnpm dev          # API em :3002 e módulo em :5175
```

Swagger da API: http://localhost:3002/api/v1/docs.

Com o shell em `:5173`, o módulo aparece em `/supplies` (o shell já tem a rota e o remote configurados).

Comandos úteis: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm api:generate` (regenera o contrato e o cliente) e `pnpm check:all`.

## Convenções

- Código e identificadores em inglês; interface e documentos em português.
- Commits no padrão Conventional Commits (`feat(stock): ...`, `docs(estoque): ...`).
- Mudou a API? Rode `pnpm api:generate` e versione `openapi.json` e `apps/web/src/lib/api-client`. A CI barra divergência.
- Mudou o esquema do banco? Gere a migration (`pnpm db:migrate`) e versione-a. A CI valida.
- Cada história do `docs/backlog.md` vira uma branch e um merge request.

## Portas

| Componente | Porta |
| --- | --- |
| Shell | 5173 |
| Módulo (frontend) | 5175 |
| API do módulo | 3002 |
| PostgreSQL do módulo | 5434 |
