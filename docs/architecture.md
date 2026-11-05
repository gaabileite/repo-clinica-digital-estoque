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

## Decisões adotadas

Os interessados não respondem às perguntas em aberto, então a equipe decidiu. Cada decisão abaixo vale até haver razão para mudar; ao mudar, atualize esta seção e os arquivos que ela cita.

### Técnicas

| Tema | Decisão |
| --- | --- |
| Saldo e FEFO | O livro de movimentações é a fonte da verdade. O saldo de cada lote é atualizado na mesma transação que grava a movimentação. Saídas travam os lotes envolvidos (`SELECT ... FOR UPDATE`, em ordem de id, para evitar impasse). |
| Quantidades | `Decimal` (o mesmo do Prisma) no domínio e no banco, string decimal na API. Hoje o domínio usa `number`; trocar é a primeira tarefa da Sprint 2, antes da primeira saída real. |
| Eventos | Padrão outbox: o evento é gravado na mesma transação (`outbox_events`) e despachado por um processo do módulo, com entrega "pelo menos uma vez". Sem barramento na plataforma, o despacho só registra em log. |
| Autenticação | Delegada ao shell: o módulo repassa o cookie de sessão para `GET {SHELL_API_URL}/api/v1/auth/me` e usa o usuário devolvido (id e nome; o e-mail não é guardado, RNF-06). O perfil do módulo e as clínicas do usuário ficam na tabela `user_cache`, mantida pelo Superuser e pelo Administrador. O primeiro usuário ADMIN do shell entra como Superuser. Os cabeçalhos `x-dev-*` servem só para testes locais e a API recusa subir com eles em produção. |
| Prefixo das rotas | `/api/v1`, que é o que o shell encaminha em `/api/v1/supplies`. O `/stock/v1` do contrato vale para um gateway futuro; a v0.12 do contrato registra a diferença. |
| Idioma dos campos | Inglês em toda a API. O cadastro de insumo, que no contrato v0.11 usava `nome` e `controlaLoteValidade`, passa a usar `name`, `tracksLotAndExpiry` etc. |
| Idempotência | Tabela `idempotency_records`, com retenção de 72 horas, como no contrato. |
| Exportações | Geradas no servidor (PDF e Excel) e devolvidas na própria resposta. Não depende do módulo de Arquivos. A rota assíncrona `report-exports` do contrato fica para quando o volume exigir. |
| Varredura diária | Rotina do próprio módulo (`@nestjs/schedule`, 02h, fuso America/Recife) para validade, consumo aprendido e prazo dos recebimentos incorretos. A rota `internal/jobs/daily-scan` serve para rodar à mão. |
| Outros módulos | Atendimento, Solicitações, Notificações e Arquivos ficam atrás de interfaces (adaptadores) com implementação simulada até haver integração. E-mail e WhatsApp são simulados; a central de notificações no aplicativo é real. |

### De produto (pontos em aberto da seção 6 dos requisitos)

| Ponto | Decisão |
| --- | --- |
| 1. Estoque orçamentário | Custo unitário de referência por insumo, mantido pelo Controlador. Sem orçamento previsto por clínica e sem custo por lote. |
| 2. Ações do Controlador | Consulta as telas monetárias, edita o custo e exporta os relatórios monetários. Não aprova compras nem registra movimentações. |
| 3. Empréstimo | Só registra o destinatário, sem prazo nem controle de retorno. |
| 4. Categorias | Categorias de insumo, por clínica. As nove categorias de movimentação são fixas. |
| 5. Notificação à empresa | A equipe faz o contato fora do sistema. O sistema registra a data e alerta aos 45 dias. |
| 6. Margem do nível crítico | 20%, ajustável pelo Superuser. Rever depois de 60 dias de dados reais. |
| 7. Antecedência de validade | Por insumo, padrão de 30 dias. Sem padrão por categoria. |
| 8. Sistema de solicitações | Campos mínimos (número, data e itens) atrás de um adaptador simulado. |
| 9. Controle por lote | Opcional por insumo; recomendado para os que têm validade. |
| 10. Lotes vencidos | Baixa manual, com atalho para descartar todos de uma vez. Sem baixa automática. |
| 11. Resumo de notificações | Semanal, na segunda-feira. |
| 12. Transferência entre clínicas | Fora desta fase, sem fluxo de aprovação definido. |

O contrato v0.11 ainda não cobre o Controlador Orçamentário (`/budget`, custo) nem a central de notificações; essas rotas já existem no esqueleto, marcadas como fora do contrato, e entram na v0.12.
