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
  <módulo>/        controller, service, module e dto, um por funcionalidade (20 módulos)
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
| Regras puras: nível crítico, FEFO, validade, tempo de reposição, consumo médio, com testes. Outbox de eventos: gravação transacional, despachante com espera crescente e fila de descarte, com testes e integração com o banco. Seed de demonstração coerente com o livro | Services das 20 funcionalidades (64 rotas de negócio já declaradas e documentadas no OpenAPI, mais 2 de saúde) |
| Matriz de permissões por perfil, guards e isolamento por clínica, com teste | Persistência (Prisma) e publicação de eventos |
| Esquema do banco e migration inicial | Telas e hooks de dados do web |
| Erros RFC 9457, observabilidade, `Idempotency-Key` obrigatório | Autenticação real (hoje só cabeçalhos de desenvolvimento) |
| CI, geração do contrato e do cliente, execução isolada do módulo | Integrações com IAM, Organização, Atendimento, Solicitações, Notificações e Arquivos (adaptadores simulados até lá) |

## Decisões adotadas

Os interessados não respondem às perguntas em aberto. A equipe seguiu a recomendação do contrato (`api-contract.md`, seção 9) e, onde ela não existe, decidiu por conta própria. Cada decisão vale até haver razão para mudar; ao mudar, atualize esta seção e os arquivos que ela cita.

### Do contrato (D1 a D13)

Texto completo na seção 9 do contrato (versão 0.12).

| Decisão | Resumo |
| --- | --- |
| D1 Usuários e permissões | O IAM é dono de usuário, perfil e vínculo com clínica. O Estoque guarda o mapa perfil → escopos (RF-03) e um cache de id, nome e perfil. Não cria usuários. |
| D2 Notificações | Caixa de entrada e preferências são da plataforma. O Estoque só produz alertas; a tela de Notificações lê a plataforma por adaptador. |
| D3 Catálogo | O Estoque é dono, com código gerado por ele. |
| D4 Baixa por procedimento | Proposta pendente que o usuário confirma ou ajusta; confirmação automática ligável por clínica (desligada por padrão). |
| D5 Fornecedor | Texto livre nos recebimentos incorretos. |
| D6 Eventos | CloudEvents, "pelo menos uma vez", outbox para publicar, deduplicação por id ao consumir e fila de descarte depois de 5 tentativas. |
| D7 Auditoria | O Estoque mantém a própria trilha por 5 anos; sem auditoria central. |
| D8 e D10 Valores e orçamento | Custo unitário de referência por insumo, mantido pelo Controlador; visão orçamentária no módulo; sem orçamento previsto nem custo por lote. Substitui a posição das versões 0.9 a 0.11 do contrato. |
| D9 SLA | Manutenção aos domingos, 0h às 4h; chamadas entre módulos com limite de 2 s, 2 novas tentativas e circuit breaker (contrato, seção 8); disponibilidade alvo de 99,5% no horário das clínicas. |
| D11 Empréstimo | Só registra o destinatário. |
| D12 Categorias | São as categorias de insumo. |
| D13 Notificação à empresa | Feita pela equipe, fora do sistema; o sistema alerta aos 45 dias. |

### Técnicas do módulo

| Tema | Decisão |
| --- | --- |
| Autenticação | Token JWT do IAM no cabeçalho `Authorization`, com as claims `sub`, `profile` e `clinic_ids` (contrato, seção 2). Enquanto o IAM não emitir o token para o módulo, valem os cabeçalhos `x-dev-*`, só em desenvolvimento; a API recusa subir com eles em produção. |
| Saldo e FEFO | O livro de movimentações é a fonte da verdade. O saldo do lote é atualizado na mesma transação que grava a movimentação. Saídas travam os lotes envolvidos (`SELECT ... FOR UPDATE`, em ordem de id). |
| Quantidades | `Decimal` no domínio e no banco, string decimal na API. Hoje o domínio usa `number`; trocar é a primeira tarefa da Sprint 2, antes da primeira saída real. |
| Prefixo das rotas | O módulo responde em `/api/v1`, que o shell encaminha em `/api/v1/supplies`; o gateway da plataforma o publica como `/stock/v1`. |
| Idioma dos campos | Inglês em toda a API (contrato 0.12). |
| Idempotência | Tabela `idempotency_records`, retenção de 72 horas. |
| Exportações | Assíncronas (`report-exports`, resposta 202), em PDF e Excel, com o arquivo guardado pelo módulo de Arquivos (adaptador simulado, com armazenamento local, até existir). |
| Varredura diária | O agendador da plataforma chama `internal/jobs/daily-scan`. Enquanto não houver agendador, uma rotina local do módulo (02h, America/Recife) chama a mesma função. |
| Outros módulos | Atendimento, Solicitações, Notificações e Arquivos ficam atrás de interfaces (adaptadores) com implementação simulada. E-mail e WhatsApp são da plataforma. |

### De produto (pontos em aberto da seção 6 dos requisitos)

As decisões estão escritas ao lado de cada ponto em `requirements.md` (seção 6). Resumo:

| Ponto | Decisão |
| --- | --- |
| 1 e 2. Orçamento e Controlador | Custo por insumo; o Controlador consulta, edita o custo e exporta; não aprova compras. |
| 3. Empréstimo | Só destinatário. |
| 4. Categorias | De insumo, por clínica. |
| 5. Notificação à empresa | Fora do sistema. |
| 6. Margem do nível crítico | 20%, ajustável; rever com 60 dias de dados. |
| 7. Antecedência de validade | Por insumo, padrão de 30 dias. |
| 8. Solicitações | Campos mínimos por adaptador simulado. |
| 9. Controle por lote | Opcional por insumo; recomendado para os que têm validade. |
| 10. Lotes vencidos | Baixa manual, com atalho para descartar todos. |
| 11. Resumo de notificações | Da plataforma; semanal, na segunda-feira. |
| 12. Transferência entre clínicas | Fora desta fase. |
