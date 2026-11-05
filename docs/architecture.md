# Arquitetura do módulo

## Posição na plataforma

O Estoque é um micro frontend independente (ADR-007 do shell): frontend, API, banco, contrato e esteira próprios. O shell hospeda a navegação, o tema e a identidade; o módulo entrega só o conteúdo.

```text
Navegador
  └─ Shell (:5173)  ── menu lateral, cabeçalho, tema, usuário
        └─ /supplies/*  ──(Module Federation)──▶  Módulo Estoque (:5175)  remote suppliesMfe, expõe ./App
                                                      │  /api/v1  (o shell encaminha /api/v1/supplies)
                                                      ▼
                                              API do módulo (:3002, NestJS)  ──▶  PostgreSQL do módulo (:5434)
                                                      │
                                      eventos e APIs de outros módulos (IAM, Organização, Atendimento,
                                      Solicitações, Notificações, Arquivos, Auditoria): premissas do contrato
```

Portas reservadas em `docs/module-catalog.md` do shell: frontend 5175, API 3002, banco 5434.

## Contrato com o shell

- Remote `suppliesMfe`, entrada `http://localhost:5175/remoteEntry.js`, módulo exposto `./App` com `export` nomeado `App` e sem props obrigatórias. `react` e `react-dom` são singleton.
- Cores e tema: o módulo usa os tokens semânticos do shell (`--surface`, `--heading`, `--brand-*`, `--status-*`) e acompanha a classe `.dark` de `<html>`. Não redefine tokens e não usa o preflight do Tailwind dentro do shell.
- Navegação: o módulo avisa a troca de tela com o evento `mfe-navigated` e escuta `shell-navigated`. Telas em `/supplies/<tela>`. Não usa react-router, porque a cópia dele seria separada da do shell.
- Falha do módulo: o shell mostra o aviso do `ErrorBoundaryMfe` e continua funcionando.
- Execução isolada obrigatória: `pnpm web:dev` sobe só o módulo, com os tokens do shell em `styles/standalone.css`.

## Organização do código

```text
apps/api/src/
  access/          perfis, escopos (stock:*), AuthGuard e PermissionsGuard
  common/          erro RFC 9457, paginação, observabilidade, idempotência
  config/          configuração do ambiente
  domain/          regras de negócio puras, sem framework, com testes (RN-01 a RN-04, RN-08)
  events/          eventos consumidos e publicados (CloudEvents); publicação pelo padrão outbox
  prisma/          acesso ao banco
  <módulo>/        controller, service, module e dto, um por funcionalidade (21 módulos)
apps/api/prisma/   schema.prisma e migrations
apps/web/src/
  app/             rotas das telas, permissões, barra de navegação
  features/<tela>/ página e hooks de dados de cada tela
  components/ui/   estados vazio, carregando e erro, cabeçalho de página (padrões do shell)
  lib/             navegação com o shell e cliente da API (gerado pelo Orval)
  styles/          utilitários do Tailwind sobre os tokens do shell
```

Princípios:

- **Regra de negócio fica em `domain/`**, em funções puras testáveis. Os services chamam o domínio e o banco.
- **O servidor é a fonte da verdade** das permissões e do isolamento por clínica (RN-13, RNF-05). Esconder dado na tela não basta; valores monetários só saem para quem tem o escopo (RN-15).
- **Livro de movimentações só recebe inclusões.** Estorno é um lançamento novo (RN-07). Cada movimentação guarda lote e validade (RNF-14).
- **Contrato primeiro:** o `openapi.json` é gerado da API e o cliente do web é gerado dele; a CI barra divergência.

## O que já está pronto e o que é esqueleto

| Pronto | Esqueleto (lança 501 "não implementado") |
| --- | --- |
| Regras puras: nível crítico, FEFO, validade, tempo de reposição, consumo médio, com testes | Services das 21 funcionalidades (69 rotas já declaradas e documentadas no OpenAPI) |
| Matriz de permissões por perfil, guards e isolamento por clínica, com teste | Persistência (Prisma) e publicação de eventos |
| Esquema do banco e migration inicial | Telas e hooks de dados do web |
| Erros RFC 9457, observabilidade, `Idempotency-Key` obrigatório | Autenticação real (hoje só cabeçalhos de desenvolvimento) |
| CI, geração do contrato e do cliente, execução isolada do módulo | Integrações com IAM, Organização, Atendimento, Solicitações, Notificações e Arquivos |

## Pontos que dependem de decisão

Registrados em `docs/decisions/`: modelo de saldo e outbox (ADR-001), autenticação e prefixo do contrato (ADR-002), exportações e rotinas (ADR-003). O contrato v0.11 ainda não cobre o Controlador Orçamentário (`/budget`, custo) nem a central de notificações; essas rotas já existem no esqueleto, marcadas como fora do contrato.
