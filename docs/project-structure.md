# Estrutura do repositório

Este documento diz o que existe em cada pasta e arquivo. Ao criar ou apagar um arquivo, atualize a linha correspondente.

## Front e back no mesmo repositório

Sim. É um monorepo com dois pacotes: `apps/web` (o micro frontend, que o shell carrega) e `apps/api` (a API do módulo). Cada módulo da plataforma tem frontend, API e banco próprios (ADR-007 do shell), e aqui os dois ficam juntos para o time mudar tela, rota e contrato no mesmo merge request. O contrato liga os dois: a API gera o `openapi.json`, e o cliente do web é gerado dele.

## Mapa

```text
.
├── apps/
│   ├── api/                 API NestJS + Prisma (porta 3002)
│   │   ├── prisma/          esquema do banco, migrations e seed
│   │   ├── src/             código da API (ver abaixo)
│   │   └── test/            testes e2e
│   └── web/                 micro frontend React (porta 5175)
│       └── src/             app, telas, componentes, lib e estilos
├── docs/                    requisitos, contrato, backlog, planejamento, arquitetura e decisões
├── prototype/               protótipo clicável, só como referência de interface
├── scripts/                 banco, contrato, ambiente e dev (5 arquivos)
├── .github/workflows/       CI
└── openapi.json             contrato gerado pela API
```

## Raiz

| Arquivo | Para quê |
| --- | --- |
| `.env.example` | Modelo das variáveis de ambiente (portas, banco, origem do shell, autenticação de desenvolvimento). Copie para `.env`, que não vai para o Git. |
| `.gitignore` | O que o Git ignora: dependências, builds, `.env`, arquivos gerados pelo Module Federation e pelo TypeScript. |
| `.nvmrc` | Versão do Node usada no projeto e na CI (24). |
| `README.md` | Porta de entrada: o que é o projeto, como rodar, convenções e portas. |
| `compose.yaml` | Sobe só o PostgreSQL do módulo (porta 5434) com Docker Compose. |
| `openapi.json` | Contrato da API gerado pela própria API (`pnpm api:generate`). Não editar à mão; a CI barra divergência. |
| `orval.config.cjs` | Configura o Orval, que gera o cliente TypeScript do web a partir do `openapi.json`. |
| `package.json` | Raiz do monorepo: versão do pnpm e do Node e todos os comandos (`dev`, `lint`, `test`, `db:*`, `api:*`). |
| `pnpm-lock.yaml` | Versões exatas das dependências. Versionado para a CI instalar sempre o mesmo. |
| `pnpm-workspace.yaml` | Declara os pacotes do monorepo (`apps/*`). |
| `turbo.json` | Orquestra `lint`, `typecheck`, `test` e `build` nos dois pacotes. |

## CI e scripts

### Fluxos de CI (`.github/workflows/`)

| Arquivo | Para quê |
| --- | --- |
| `ci.yml` | CI a cada merge request e push: lint, tipos, testes, migrations e seed num PostgreSQL de teste, e2e com banco, sincronia do contrato e build do remote. |
| `prisma-migrations.yml` | CI das migrations: sobe um PostgreSQL temporário e confere que o esquema e as migrations estão iguais. |

### Scripts (`scripts/`)

Cada script agrupa subcomandos relacionados; os comandos do `package.json` (`pnpm db:up`, `pnpm api:check` etc.) chamam esses arquivos. Sem argumento válido, o script mostra o uso.

| Arquivo | Para quê |
| --- | --- |
| `lib.mjs` | Funções comuns: validar versões de Node e pnpm, ler e validar o `.env`, checar porta livre e executar comandos. |
| `db.mjs` | Banco do módulo: `setup` (tudo de uma vez), `up`, `down`, `migrate`, `seed`, `studio`, `check` (esquema x migrations, usado na CI) e `deploy` (produção). |
| `api.mjs` | Contrato da API: `generate` (gera o `openapi.json` e o cliente do web) e `check` (falha se algo está desatualizado, usado na CI). |
| `check.mjs` | Verificações de ambiente: `runtime` (versões) e `env` (`.env`). |
| `dev.mjs` | Sobe a API e o módulo juntos (`pnpm dev`), checando versões, `.env` e portas livres. |

## Documentação (`docs/`)

### Arquivos

| Arquivo | Para quê |
| --- | --- |
| `README.md` | Índice da documentação. |
| `api-contract.md` | Contrato de APIs v0.12: APIs consumidas e expostas, eventos, segurança, erros e as decisões adotadas. Pode ser compartilhado com o cliente. |
| `architecture.md` | Como o módulo se encaixa no shell, como o código está organizado, o que está pronto ou é esqueleto e as decisões adotadas. |
| `backlog.md` | Épicos e histórias com critérios de aceite. Interno. |
| `requirements.md` | Requisitos v2.1: funcionais, regras de negócio, não funcionais, escopo e as decisões dos pontos em aberto. Pode ser compartilhado com o cliente. |
| `sprint-planning.md` | Planejamento básico das sprints, capacidade, rituais e modelo. Interno. |

## API (`apps/api/`)

Configuração, banco e testes:

| Arquivo | Para quê |
| --- | --- |
| `eslint.config.mjs` | Regras de lint da API. |
| `nest-cli.json` | Configuração do Nest CLI (build). |
| `package.json` | Dependências e comandos da API (`build`, `dev`, `test`, `test:e2e`, `prisma:generate`). |
| `prisma/migrations/20261105000000_initial_schema/migration.sql` | Migration inicial, gerada do esquema (19 tabelas). |
| `prisma/migrations/20261105100000_review_schema_and_outbox_retry/migration.sql` | Revisão do esquema: contadores de código por clínica, campos de tentativa do outbox, cache de usuário só com id, nome e perfil, e regras que o Prisma não expressa (saldo de lote nunca negativo, custos e prazos não negativos, um alerta aberto por insumo e tipo). |
| `prisma/migrations/migration_lock.toml` | Trava o provedor de banco das migrations (PostgreSQL). Gerado pelo Prisma. |
| `prisma/schema.prisma` | Esquema do banco: clínicas, insumos, lotes, livro de movimentações, notas, alertas, auditoria, outbox, fila de descarte e outros (19 tabelas). |
| `prisma/seed.mjs` | Seed de desenvolvimento: parâmetros padrão e três clínicas; Odontologia e Fisioterapia com categorias, insumos, lotes (inclusive um vencido e um a vencer) e movimentações coerentes com os saldos. Pode rodar de novo sem duplicar. |
| `test/health.e2e-spec.ts` | Teste e2e: `/health/live` abre e rota de negócio sem login devolve 401; com `TEST_DATABASE_URL`, confere também `/health/ready` no banco real. |
| `test/outbox.e2e-spec.ts` | Integração com o PostgreSQL (só roda com `TEST_DATABASE_URL`): gravação, envio, falha, fila de descarte e retenção de 7 dias. |
| `tsconfig.build.json` | TypeScript do build: exclui os testes. |
| `tsconfig.json` | TypeScript da API (decorators ligados, modo estrito). |
| `tsconfig.test.json` | TypeScript dos testes (tipos do Vitest). |
| `vitest.config.mts` | Testes unitários: `src/**/*.spec.ts`. |
| `vitest.e2e.config.mts` | Testes e2e: `test/**/*.e2e-spec.ts`. |

### Código (`apps/api/src/`)

Arquivos de base:

| Arquivo | Para quê |
| --- | --- |
| `app.module.ts` | Módulo raiz: junta configuração, banco, acesso, eventos e todas as funcionalidades, filtro de erro e interceptadores. |
| `generate-openapi.ts` | Gera o `openapi.json` sem precisar de banco (usado por `pnpm api:generate`). |
| `main.ts` | Inicia a API: prefixo `/api/v1`, validação, CORS para o shell e Swagger. |
| `openapi.ts` | Monta o documento OpenAPI e a página do Swagger (`/api/v1/docs`). |

Pastas de apoio:

| Arquivo | Para quê |
| --- | --- |
| `access/access.decorators.ts` | `@Public()`, `@RequirePermissions(...)` e `@CurrentAuth()`. |
| `access/access.module.ts` | Liga os dois guards a todas as rotas. |
| `access/auth-context.ts` | Tipo de quem chama: usuário, perfil, clínicas e chave de visão orçamentária. |
| `access/auth.guard.ts` | Identifica o chamador. Hoje só aceita a autenticação de desenvolvimento por cabeçalhos; a real valida o token JWT do IAM (ver `architecture.md`). |
| `access/permissions.guard.ts` | Confere o escopo exigido pela rota e o vínculo do usuário com a clínica (`STOCK_CLINIC_FORBIDDEN`). |
| `access/permissions.spec.ts` | Testes da matriz (por exemplo, o Controlador não opera o estoque). |
| `access/permissions.ts` | Escopos `stock:*` e a matriz padrão de permissões por perfil. |
| `access/profile.ts` | Os quatro perfis: superuser, admin, warehouse, budget-controller. |
| `common/dto/pagination.dto.ts` | Parâmetros e resposta de paginação. |
| `common/dto/problem-details.dto.ts` | Formato de erro (RFC 9457) exposto no OpenAPI. |
| `common/filters/problem-details.filter.spec.ts` | Testes do filtro de erro. |
| `common/filters/problem-details.filter.ts` | Converte qualquer erro em resposta `application/problem+json`. |
| `common/idempotency/idempotency.ts` | Exige o cabeçalho `Idempotency-Key` nos POSTs que mexem no saldo. A guarda das respostas ainda é pendência. |
| `common/not-implemented.ts` | Ajudante que devolve 501 nas operações ainda não implementadas. |
| `common/observability/error-monitoring.service.ts` | Ponto único para reportar erros inesperados. |
| `common/observability/logging.interceptor.ts` | Registra cada requisição sem gravar o corpo. |
| `common/observability/observability.spec.ts` | Testes do registro e da redação de dados. |
| `common/observability/redaction.ts` | Oculta dados sensíveis dos registros. |
| `common/observability/request-id.middleware.ts` | Gera e propaga o `X-Request-Id`. |
| `config/app.config.ts` | Lê a configuração do ambiente e proíbe a autenticação de desenvolvimento em produção. |
| `config/config.module.ts` | Disponibiliza a configuração para toda a API. |
| `domain/consumption.ts` | RN-02: consumo médio diário e cobertura em dias. |
| `domain/critical-level.ts` | RN-01: nota de nível crítico de 0 a 10 e a situação do estoque. |
| `domain/domain.spec.ts` | Testes das regras de negócio, incluindo o caso do documento de requisitos (nota 6). |
| `domain/fefo.ts` | RN-04 e RN-09: escolha do lote pela validade mais próxima, bloqueio de vencidos e aviso de lote diferente. |
| `domain/index.ts` | Reexporta as regras do domínio. |
| `domain/lead-time.ts` | RN-03: tempo de reposição medido ou estimado. |
| `domain/validity.ts` | RN-08: vencido, a vencer ou válido. |
| `events/consumers/care-execution.consumer.ts` | V-03 e V-04: baixa pendente ou estorno a partir do Atendimento (esqueleto). |
| `events/consumers/iam-user.consumer.ts` | V-01: mantém o cache de usuários do IAM (esqueleto). |
| `events/consumers/org-clinic.consumer.ts` | V-02: provisiona ou arquiva a clínica a partir de Organização (esqueleto). |
| `events/consumers/requests.consumer.ts` | V-05: mantém os pedidos abertos vindos de Solicitações (esqueleto). |
| `events/event-publisher.service.ts` | Grava o evento no outbox, na mesma transação da movimentação (padrão outbox, ver `architecture.md`). |
| `events/event-transport.ts` | Como o evento sai do módulo. Hoje só simulado (registra em log) até a plataforma ter barramento. |
| `events/outbox.repository.ts` | Acesso ao outbox e à fila de descarte (interface e implementação com Prisma). |
| `events/outbox-dispatcher.service.ts` | Despachante: envia os eventos em ordem por subject, com espera crescente entre tentativas e fila de descarte depois de 5 falhas. |
| `events/outbox-dispatcher.spec.ts` | Testes do despachante com outbox em memória. |
| `events/processed-events.service.ts` | Deduplicação de quem consome: `claim(id)` devolve false se o evento já foi tratado. |
| `events/processed-events.spec.ts` | Testes da deduplicação. |
| `events/event-types.ts` | Lista dos eventos consumidos (V-01 a V-05) e publicados (P-01 a P-06) do contrato. |
| `events/events.module.ts` | Agrupa o publicador e os consumidores de eventos. |
| `health/health.controller.ts` | `/health/live` e `/health/ready` (este confere o banco), sem autenticação. |
| `prisma/prisma.module.ts` | Disponibiliza o acesso ao banco para toda a API. |
| `prisma/prisma.service.ts` | Cliente do Prisma com conexão no início e desconexão no fim. |
| `types/express.d.ts` | Acrescenta `req.auth` (quem está chamando) ao tipo de requisição do Express. |

### Funcionalidades da API

Cada pasta tem o mesmo desenho: `<nome>.controller.ts` (rotas, com permissão e documentação), `<nome>.service.ts` (a lógica; hoje devolve 501) e `<nome>.module.ts` (liga os dois). Algumas têm `dto/` com os corpos validados.

| Pasta | O que faz | Requisitos | Rotas |
| --- | --- | --- | --- |
| `items/` | Cadastro de insumos | RF-05 | 7 |
| `categories/` | Categorias de insumo por clínica | RF-06 | 3 |
| `packages/` | Pacotes de insumos | RF-07 | 3 |
| `stock/` | Saldo, lotes, disponibilidade, consumo e tempo de reposição | RF-19, RF-20 | 5 |
| `withdrawals/` | Retirada com FEFO e baixa de lotes vencidos | RF-09, RF-10, RF-15 | 2 |
| `procedure-consumptions/` | Baixa de pacote e baixas pendentes vindas do Atendimento | RF-11, RF-12 | 5 |
| `returns/` | Devolução de item não utilizado | RF-13 | 1 |
| `movements/` | Livro de movimentações e estorno | RF-14, RF-16 | 2 |
| `inventory-adjustments/` | Ajuste de inventário por lote | RF-17 | 1 |
| `receipts/` | Entradas, notas de recebimento, estorno da nota e requisições abertas | RF-18, RF-21 a RF-24 | 6 |
| `incorrect-receipts/` | Recebimentos incorretos: troca, incorporação e descarte | RF-25 | 5 |
| `alerts/` | Alertas vigentes (nível crítico, validade e uso) | RF-26 a RF-28 | 1 |
| `dashboard/` | Painel de controle | RF-37 | 2 |
| `reports/` | Relatórios e exportação | RF-38 a RF-41 | 5 |
| `network/` | Visão consolidada da rede (Superuser) | RF-34 | 4 |
| `audit/` | Trilha de auditoria | RF-36 | 1 |
| `permissions/` | Permissões por perfil | RF-03 | 3 |
| `settings/` | Parâmetros de cálculo e de alerta | RF-04 | 2 |
| `budget/` | Visão orçamentária e custo unitário (novo no contrato 0.12) | RF-42 a RF-45 | 4 |
| `internal/` | Rotas entre serviços: provisionar clínica e varredura diária | RF-01 | 2 |

Corpos validados (`dto/`):

| Arquivo | Para quê |
| --- | --- |
| `items/dto/create-item.dto.ts` | Corpo de criação de insumo (E-02), com validação. |
| `receipts/dto/create-receipt.dto.ts` | Corpo de criação de entrada e suas linhas (E-27), com validação. |
| `returns/dto/create-return.dto.ts` | Corpo de devolução (E-24), com validação. |
| `withdrawals/dto/create-withdrawal.dto.ts` | Corpo de retirada (E-18) e os tipos de saída, com validação. |

Testes e2e e as regras do domínio já têm cobertura; os services das funcionalidades ainda não.

## Web (`apps/web/`)

### Configuração

| Arquivo | Para quê |
| --- | --- |
| `eslint.config.mjs` | Regras de lint do web (ignora o cliente gerado). |
| `index.html` | Página da execução isolada do módulo. |
| `package.json` | Dependências e comandos do web (`dev`, `build`, `test`, `lint`, `typecheck`). |
| `tsconfig.json` | TypeScript do web (alias `@/` para `src/`). |
| `vite.config.ts` | Module Federation: remote `suppliesMfe`, expõe `./App`, porta 5175, proxy de `/api/v1` para a API. |
| `vitest.config.ts` | Testes do web. |

### Código (`apps/web/src/`)

| Arquivo | Para quê |
| --- | --- |
| `App.tsx` | Componente exposto ao shell: barra de navegação do módulo e a tela atual. |
| `app/ModuleNav.tsx` | Barra de navegação do módulo (o menu lateral e o cabeçalho são do shell). |
| `app/permissions.ts` | Tipo dos escopos (espelha a API; os valores virão de `/me/permissions`). |
| `app/routes.spec.ts` | Testes do registro de telas. |
| `app/routes.ts` | Registro das telas: URL, rótulo, componente e escopo exigido. |
| `components/ui/index.ts` | Reexporta os componentes de interface. |
| `components/ui/page-header.tsx` | Cabeçalho de página no padrão do shell. |
| `components/ui/state-feedback.tsx` | Estados vazio, carregando e erro no padrão do shell. |
| `lib/api-client/README.md` | Explica o cliente gerado. |
| `lib/api-client/custom-fetch.ts` | Único arquivo manual do cliente: como as chamadas são enviadas (credenciais e cabeçalhos de desenvolvimento). |
| `lib/api-client/index.ts` | Funções de chamada da API, geradas pelo Orval. Não editar. |
| `lib/shell-navigation.spec.ts` | Testes da leitura e montagem de caminhos. |
| `lib/shell-navigation.ts` | Protocolo com o shell: eventos `mfe-navigated` e `shell-navigated` e caminhos `/supplies/<tela>`. |
| `lib/use-shell-page.ts` | Hook que mantém a tela atual sincronizada com a URL do shell. |
| `main.tsx` | Entrada da execução isolada (o shell não usa este arquivo). |
| `styles/module.css` | Utilitários do Tailwind sobre os tokens de cor do shell. Não redefine tokens. |
| `styles/standalone.css` | Tokens do shell copiados, só para a execução isolada. |
| `vite-env.d.ts` | Tipos do Vite. |

### Telas (`src/features/`)

Cada pasta tem `<Nome>Page.tsx` (a tela, hoje com o estado "Em construção"), `api.ts` (os hooks de dados da tela) e `index.ts`.

| Pasta | Tela | Requisitos |
| --- | --- | --- |
| `dashboard/` | Painel | RF-37 |
| `stock/` | Estoque | RF-19 |
| `withdrawals/` | Saídas | RF-09 a RF-12, RF-15 |
| `returns/` | Devolução | RF-13 |
| `receipts/` | Entradas | RF-18, RF-22 a RF-25 |
| `movements/` | Movimentações | RF-14, RF-16, RF-17 |
| `reports/` | Relatórios | RF-38 a RF-41 |
| `registrations/` | Cadastros | RF-05 a RF-08, RF-43 |
| `settings/` | Configurações | RF-03, RF-04 |
| `notifications/` | Notificações (caixa de entrada da plataforma) | RF-26 a RF-32 |
| `budget/` | Visão orçamentária | RF-42 a RF-45 |

O cliente gerado em `src/lib/api-client/models/` tem 10 arquivos de tipos criados pelo Orval; não edite.

## Protótipo (`prototype/`)

Protótipo clicável validado, com 12 arquivos. Serve só de referência visual e de comportamento: o módulo de verdade é construído em `apps/`. Ver `prototype/README.md`.

## Onde mexer ao implementar uma história

| Quero... | Mexa em |
| --- | --- |
| Implementar uma operação da API | `apps/api/src/<funcionalidade>/<nome>.service.ts` (e o controller, se a rota mudar) |
| Mudar uma regra de negócio | `apps/api/src/domain/` e o teste ao lado |
| Mudar o banco | `apps/api/prisma/schema.prisma` e gerar a migration (`pnpm db:migrate`) |
| Mudar uma rota ou corpo da API | O controller ou o `dto/`; depois `pnpm api:generate` e versionar `openapi.json` e o cliente |
| Construir uma tela | `apps/web/src/features/<tela>/` |
| Chamar a API no web | `apps/web/src/features/<tela>/api.ts`, usando o cliente gerado |
| Mudar permissões por perfil | `apps/api/src/access/permissions.ts` (e `apps/web/src/app/permissions.ts`) |

## O que não editar à mão

- `openapi.json` e `apps/web/src/lib/api-client/` (menos o `custom-fetch.ts`): gerados por `pnpm api:generate`.
- Migrations já publicadas: crie uma nova em vez de alterar.
- `pnpm-lock.yaml`: muda só pelo pnpm.
