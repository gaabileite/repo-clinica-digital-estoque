# Contrato de APIs: Módulo de Estoque

**Escopo:** RF-01 a RF-31, RF-36 a RF-42, RNF-01 a RNF-11 e N-01 a N-13. Transferências entre clínicas (RF-31* a RF-35) ficam para fase futura, sem endpoint reservado.

Nomes e prefixos dos outros módulos (iam, org, care, requests, notify, files, audit) são premissas a validar com a arquitetura da plataforma.

## 1. Responsabilidades

| Dado | Dono | Papel do Estoque |
|---|---|---|
| Usuários, perfis, sessões | IAM | Guarda só ID e cache de nome |
| Clínicas | Organização | Cria o tenant ao receber o evento |
| Procedimentos e execuções | Atendimento | Guarda o vínculo pacote ↔ procedimento |
| Pedidos de insumo | Solicitações | Lê o pedido e informa o recebimento |
| Alertas entregues, preferências, canais | Notificações | Só produz o alerta |
| Arquivos | Arquivos | Guarda só o fileId |
| Insumos, lotes, saldos, movimentações, pacotes, notas, recebimentos incorretos, alertas | Estoque | Fonte única do saldo |
| Trilha de auditoria | Auditoria | Mantém também o próprio livro por 5 anos |

## 2. Convenções

- **Formato:** REST/HTTPS (TLS 1.2+), JSON UTF-8, OpenAPI 3.1. Eventos em CloudEvents 1.0.
- **Base:** `/stock/v1`.
- **Autenticação:** OAuth 2.0/OIDC, JWT Bearer. Claims: `sub`, `profile` (superuser, admin, warehouse), `clinic_ids`, `scope`. Entre serviços: client credentials.
- **Isolamento:** recursos sob `/clinics/{clinicId}`. Responde 403 se a clínica não está em `clinic_ids`, exceto superuser (leitura em todas).
- **IDs:** UUID v7. O código do insumo (`sku`) é único por clínica.
- **Quantidades:** string decimal (`"12.500"`).
- **Datas:** instante em ISO 8601 UTC. Validade em data civil, fuso America/Recife.
- **Paginação:** cursor (`limit` máx. 200). Resposta `{data, page:{nextCursor}}`.
- **Idempotência:** `Idempotency-Key` obrigatório em todo POST que altera saldo. Resposta mantida por 72 h. Mesma chave com corpo diferente: 422.
- **Concorrência:** ETag + If-Match. Versão desatualizada: 412.
- **Rastreio:** `X-Request-Id` + `traceparent`.
- **Erros:** `application/problem+json` (RFC 9457) com `type`, `title`, `status`, `detail`, `code`, `errors[]`.
- **Versionamento:** versão maior no caminho. Descontinuação com 6 meses de aviso (`Deprecation`, `Sunset`).
- **Limite:** 600 req/min por usuário. Excedido: 429 com `Retry-After`.

## 3. Integrações e fases

| Módulo | Prioridade | Fase |
|---|---|---|
| A1 IAM | Essencial | 1 |
| A2 Organização | Essencial | 1 |
| A5 Notificações | Essencial | 1 |
| A7 Auditoria | Essencial | 1 |
| A3 Atendimento | Essencial | 2 |
| A4 Solicitações | Importante | 2 |
| A6 Arquivos | Importante | 3 |

## 4. APIs consumidas

**A1 IAM (`/iam/v1`)**
- D-01 `GET /.well-known/jwks.json`: chaves para validar JWT.
- D-02 `POST /oauth/token`: tokens (code + PKCE; client credentials).
- D-03 `GET /users/{userId}`: nome, perfil, clínicas, situação.
- D-04 `GET /users?clinicId=&profile=&status=active`: destinatários de alertas.
- D-05 `POST /users:batch-get`: até 100 IDs.
- V-01 `iam.user.created|updated|deactivated`: atualiza o cache e bloqueia retiradas de usuário inativo.

**A2 Organização (`/org/v1`)**
- D-06 `GET /clinics`: clínicas ativas (superuser).
- D-07 `GET /clinics/{clinicId}`: dados da clínica.
- V-02 `org.clinic.created|updated|deactivated`: provisiona ou arquiva o tenant.

**A3 Atendimento (`/care/v1`)**
- D-08 `GET /procedures?clinicId=`: catálogo, para vincular pacotes.
- D-09 `GET /procedure-executions/{executionId}`: dados da execução.
- V-03 `care.procedure-execution.completed`: cria baixa pendente.
- V-04 `care.procedure-execution.cancelled`: estorna a baixa gerada.

**A4 Solicitações (`/requests/v1`)**
- D-10 `GET /requests?clinicId=&status=open`: pedidos abertos.
- D-11 `GET /requests/{requestId}`: data, itens e quantidades.
- V-05 `requests.request.created|approved|cancelled`: mantém a lista de pedidos abertos.

**A5 Notificações (`/notify/v1`)**
- D-12 `PUT /categories/{categoryId}`: registra as categorias de alerta do Estoque.
- D-13 `POST /notifications`: envia alerta (`groupKey`, `dedupeKey`).
- D-14 `GET /inbox?category=stock.*`: caixa de entrada.
- D-15 `PATCH /inbox/{id}`: lida/não lida.
- D-16 `GET /users/{userId}/preferences`: preferências do usuário.
- D-17 `PUT /users/{userId}/preferences/{categoryId}`: altera preferência.

**A6 Arquivos (`/files/v1`)**
- D-18 `POST /files`: upload por URL pré-assinada.
- D-19 `GET /files/{fileId}/signed-url?ttl=300`: download temporário.

**A7 Auditoria (`/audit/v1`)**
- D-20 `POST /events:batch`: até 500 eventos.

## 5. APIs expostas (`/stock/v1`)

Perfis: **S** superuser, **A** administrador, **AL** almoxarife. O superuser lê todas as clínicas e não registra movimentações. "+serviço" = acesso por client credentials com escopo `stock:service`. `{c}` = `/clinics/{clinicId}`.

### Cadastros
- E-01 `GET {c}/items`: lista insumos (filtros `q`, `code`, `category`, `status`, `active`). S A AL
- E-02 `POST {c}/items`: cria insumo (nome, categoria, unidade, `registraTemperatura`, `controlaLoteValidade`, `tempoReposicaoEstimadoDias`, `antecedenciaAlertaValidadeDias`). Código `INS-0001…` gerado pelo sistema. A
- E-03 `GET {c}/items/{id}`: detalhe. S A AL
- E-04 `PATCH {c}/items/{id}`: altera (If-Match). O código não muda. A
- E-05 `POST {c}/items/{id}/deactivate`: inativa (`/reactivate` reativa). Não apaga insumo com saldo. A
- E-06 `GET /catalog/units`: unidades de medida. S A AL
- E-07 `GET {c}/item-categories`: categorias da clínica, com nº de insumos. S A AL
- E-08 `POST {c}/item-categories`: cria categoria. `PATCH /item-categories/{id}` renomeia (atualiza os insumos) ou inativa (recusa se houver insumo ativo). A
- E-09 `GET {c}/packages`: lista pacotes e seus insumos. S A AL
- E-10 `POST {c}/packages`: cria pacote (nome, grupo de material, `procedureId` opcional, lista `{itemId, quantidade padrão}`). A
- E-11 `PATCH {c}/packages/{id}`: altera ou inativa. A

### Saldo, lotes e painel
- E-12 `GET {c}/balances`: saldo por insumo, com situação (adequado, repor, crítico, sem estoque), nível crítico 0 a 10 (10 = muito crítico; a partir de 7 é crítico), cobertura em dias, `nearestExpiry` e nº de lotes vencidos. S A AL
- E-13 `GET {c}/items/{id}/lots`: lotes com saldo por validade; o primeiro utilizável vem com `suggested=true`. S A AL
- E-14 `GET {c}/items/{id}/availability?quantity=`: disponibilidade (sem lotes vencidos) e `suggestedLot`. S A AL +serviço
- E-15 `GET {c}/items/{id}/consumption-profile`: consumo médio de 30 dias, média aprendida (dias 15 a 90), média dos últimos 14 dias, indicador de queda. S A AL
- E-16 `GET {c}/dashboard`: painel por perfil, sem valores monetários. Todos: itens controlados, em nível crítico, a vencer e com lote vencido, listas de críticos, validades e lotes vencidos. A e S: também últimas movimentações. AL: só o resumo. S A AL
- E-17 `GET {c}/dashboard/weekly-consumption?itemCode=&weeks=8`: consumo semanal em quantidade. S A

### Saídas
- E-18 `POST {c}/withdrawals`: retirada pelo código. `kind`: `consumption`, `expiry-loss`, `damage-discard`, `loan`, `donation`. Sugere o lote de validade mais próxima; `lotId` escolhe outro. `loan` e `donation` exigem `recipient`. A resposta traz `warnings[]` (`LOT_NOT_NEAREST_EXPIRY`, `QUANTITY_ABOVE_DAILY_AVERAGE`); cada aviso gera alerta ao administrador. A AL
- E-19 `POST {c}/procedure-consumptions:preview`: dado pacote e nº de execuções, devolve insumos, quantidades padrão e disponibilidade, sem baixar. A AL +serviço
- E-20 `POST {c}/procedure-consumptions`: confirma baixa de procedimento. Quantidade diferente do padrão exige `justification`. `executionId` opcional (idempotência por execução). A AL +serviço
- E-21 `GET {c}/pending-consumptions`: baixas pendentes geradas por execuções. A AL
- E-22 `POST {c}/pending-consumptions/{id}/confirmation`: confirma, com ajustes e justificativa. `/dismissal` descarta com motivo. A AL
- E-23 `POST {c}/expired-lots:write-off`: baixa lotes vencidos como `expiry-loss`. A AL
- E-24 `POST {c}/returns`: devolução de item retirado e não utilizado (código, quantidade, lote existente ou novo com validade, `returnedBy`). A AL
- E-25 `POST {c}/movements/{id}/reversals`: estorna saída por engano; cria lançamento de estorno e mantém o original. A AL
- E-26 `POST {c}/lots/{id}/adjustments`: ajuste de inventário (quantidade contada e justificativa obrigatória). A AL

### Entradas
- E-27 `POST {c}/receipts`: registra a entrada e emite a nota de recebimento. `origin`: `central-warehouse`, `other-clinic` (só registra origem, sem fluxo de transferência), `external-donation` (exige `donorLetterFileId`; `proofFileId` opcional) ou `other` (`description`). `orderedOn` ou `requestId` importa a data do pedido (não vale para doação). `receivedOn` padrão é hoje. Linhas: código, quantidade recebida, lote, validade. A AL
- E-28 `GET {c}/receipts`: lista notas (período, origem, situação). S A AL
- E-29 `GET {c}/receipts/{id}`: detalhe, com anexos, linhas e divergências. S A AL
- E-30 `GET {c}/receipts/{id}/document`: PDF da nota (redireciona para URL assinada de Arquivos). S A AL
- E-31 `POST {c}/receipts/{id}/reversals`: estorno da nota. Só aceito se nenhum lote da nota foi movimentado; senão 409. A AL
- E-32 `GET {c}/pending-requests`: requisições abertas, para importar a data do pedido. A AL
- E-33 `GET {c}/items/{id}/lead-time`: tempo de reposição médio medido, nº de entradas e fonte (medido ou estimado). S A AL

### Recebimentos incorretos
- E-34 `GET {c}/incorrect-receipts`: lista com dias desde a notificação, prazo restante e situação (aguardando, prazo vencido, trocado, incorporado, descartado). S A AL
- E-35 `POST {c}/incorrect-receipts`: registra (descrição, quantidade, unidade, empresa, data da notificação, observação). A AL
- E-36 `POST {c}/incorrect-receipts/{id}/exchange`: empresa trocou o produto. A AL
- E-37 `POST {c}/incorrect-receipts/{id}/incorporation`: incorpora ao estoque após o prazo (padrão 45 dias); gera entrada com origem "produto abandonado". A AL
- E-38 `POST {c}/incorrect-receipts/{id}/disposal`: descarta após o prazo, com justificativa. Não baixa saldo. A AL

### Movimentações e auditoria
- E-39 `GET {c}/movements`: livro de movimentações. Filtros: `itemId`, `code`, `kind` (`consumption`, `expiry-loss`, `damage-discard`, `loan`, `donation`, `entry`, `reversal`, `inventory-adjustment`, `return`), `userId`, `from`, `to`, `lot`. Retenção mínima de 5 anos. S A AL
- E-40 `GET {c}/audit-trail`: trilha de auditoria, incluindo cadastros. S A

### Alertas
- E-41 `GET {c}/alerts`: condições vigentes: `critical-level`, `expiry`, `lot-not-nearest`, `high-withdrawal`, `consumption-drop`, `incorrect-receipt-overdue`. Cada usuário vê os tipos do seu perfil. S A AL

### Relatórios
- E-42 `GET {c}/reports/consumption`: consumo em quantidade. `groupBy`: `item`, `clinic`, `week` (os dois últimos exigem `itemId`). Aceita `text/csv`. S A
- E-43 `GET {c}/reports/losses`: perda por validade e descarte por avaria. S A
- E-44 `GET {c}/reports/abc`: curva ABC por quantidade consumida. S A
- E-45 `POST {c}/report-exports`: exportação assíncrona CSV/PDF. Responde 202; consulta em `/report-exports/{id}`, que devolve URL assinada. S A

### Visão da rede (superuser)
- E-46 `GET /network/dashboard`: situação por clínica e consolidado. S
- E-47 `GET /network/balances?code=`: saldo de um código em todas as clínicas. S
- E-48 `GET /network/weekly-consumption?clinicId=&itemCode=&weeks=8`: consumo semanal por clínica ou rede. S
- E-49 `GET /network/reports/{consumption|losses|abc}`: relatórios consolidados. S

### Permissões e configuração
- E-50 `GET /me/permissions`: permissões e clínicas do usuário. S A AL
- E-51 `GET /roles`: perfis e permissões. S
- E-52 `PUT /roles/{role}/permissions`: substitui permissões de um perfil. S
- E-53 `GET /settings`: `safetyMarginPercent`, `highWithdrawalMultiplier`, `consumptionDropPercent`, `incorrectReceiptDeadlineDays` (45). S
- E-54 `PUT /settings`: altera os parâmetros. S

### Serviço (interno)
- E-55 `PUT /internal/clinics/{clinicId}`: provisiona o tenant (consumidor de `org.clinic.created`).
- E-56 `POST /internal/jobs/daily-scan`: varredura diária (validade, consumo aprendido, prazo dos recebimentos incorretos), chamada pelo agendador.

## 6. Eventos

CloudEvents 1.0 com extensões `clinicid` e `correlationid`. Entrega pelo menos uma vez (consumidor trata duplicatas por `id`). Ordem garantida por `subject` (clínica + insumo). Publicação com outbox transacional. Após 5 falhas, a mensagem vai para fila de descarte (retida 7 dias).

**Consumidos:** V-01 a V-05 (seção 4).

**Publicados**
- P-01 `stock.item.created|updated|deactivated`: mudanças no catálogo. Consumidores: Solicitações, Atendimento.
- P-02 `stock.movement.recorded`: cada lançamento, com a categoria. Consumidores: BI, Auditoria.
- P-03 `stock.consumption.confirmed|rejected`: resultado da baixa por procedimento (com motivo da rejeição). Consumidor: Atendimento.
- P-04 `stock.receipt.completed|reversed`: recebimento concluído ou estornado. Consumidores: Solicitações, BI.
- P-05 `stock.alert.raised|cleared`: `kind` = `critical-level`, `expiry`, `lot-not-nearest`, `high-withdrawal`, `consumption-drop`. Consumidores: Notificações, painel, BI.
- P-06 `stock.incorrect-receipt.overdue`: prazo de 45 dias vencido sem troca; pede decisão entre incorporar e descartar. Consumidores: Notificações, painel.

## 7. Segurança, permissões e erros

### Escopos (padrão, configurável via E-52)

| Escopo | Permite | S | A | AL |
|---|---|---|---|---|
| `stock:read` | Consultar saldo, lotes, movimentações, painel, alertas | ✓ | ✓ | ✓ |
| `stock:network:read` | Visão consolidada | ✓ | | |
| `stock:withdraw` | Saídas e devoluções | | ✓ | ✓ |
| `stock:receive` | Entradas, estorno de nota, recebimentos incorretos | | ✓ | ✓ |
| `stock:adjust` | Ajuste de inventário | | ✓ | ✓ |
| `stock:reverse` | Estornar movimentações | | ✓ | ✓ |
| `stock:catalog:write` | Insumos, categorias, pacotes | | ✓ | |
| `stock:reports` | Relatórios, curva ABC, exportações | ✓ | ✓ | |
| `stock:audit` | Trilha de auditoria | ✓ | ✓ | |
| `stock:admin` | Permissões e parâmetros | ✓ | | |
| `stock:service` | Uso entre serviços | serviço | serviço | serviço |

### Proteção de dados
- Do usuário, o Estoque guarda só ID, nome e perfil (cache do IAM).
- Logs não registram corpo de requisição. Justificativas entram no livro de movimentações (retido 5 anos). Base legal e retenção a confirmar com o encarregado de dados.
- Arquivos sempre por URL assinada de 300 s.

### Erros de negócio

| Código | HTTP | Quando |
|---|---|---|
| `STOCK_INSUFFICIENT` | 422 | Saldo utilizável menor que o pedido (lotes vencidos não contam) |
| `STOCK_LOT_EXPIRED` | 422 | Consumo de lote vencido (usar perda por validade) |
| `STOCK_LOT_REQUIRED` | 422 | Insumo com controle de lote sem lote/validade |
| `STOCK_CODE_NOT_FOUND` | 404 | Código inexistente na clínica |
| `STOCK_RECIPIENT_REQUIRED` | 422 | Empréstimo ou doação sem destinatário |
| `STOCK_DONOR_LETTER_REQUIRED` | 422 | Doação externa sem carta do doador |
| `STOCK_JUSTIFICATION_REQUIRED` | 422 | Ajuste, inventário ou descarte sem justificativa |
| `STOCK_RECEIPT_LOT_MOVED` | 409 | Estorno recusado: lote da nota já movimentado |
| `STOCK_DEADLINE_NOT_REACHED` | 409 | Incorporar/descartar recebimento incorreto antes de 45 dias |
| `STOCK_CATEGORY_IN_USE` | 409 | Inativar categoria com insumos ativos |
| `STOCK_REVERSAL_NOT_ALLOWED` | 409 | Movimentação já estornada ou que não admite estorno |
| `STOCK_ITEM_INACTIVE` | 422 | Operação em insumo inativo |
| `STOCK_CLINIC_FORBIDDEN` | 403 | Usuário sem vínculo com a clínica |
| `STOCK_DEPENDENCY_UNAVAILABLE` | 503 | Módulo necessário fora do ar, sem alternativa |
| `IDEMPOTENCY_CONFLICT` | 422 | Chave reutilizada com corpo diferente |
| `PRECONDITION_FAILED` | 412 | If-Match desatualizado |

## 8. Requisitos não funcionais e resiliência

- **Livro imutável (RNF-01, 02):** usuário, instante, item, lote, quantidade, categoria, motivo, origem. Retenção mínima de 5 anos. Correções só por estorno ou ajuste.
- **Credenciais (RNF-03):** ficam no IAM.
- **Transporte (RNF-04):** HTTPS obrigatório (TLS 1.2+), HSTS no gateway.
- **Autorização (RNF-05):** por escopo e por `clinic_ids`, em cada chamada.
- **Dados pessoais (RNF-06):** mínimos; base legal e retenção a definir.
- **Backup (RNF-07):** automático, com restauração testada. RPO/RTO a definir pela plataforma.
- **Desempenho (RNF-08):** p95 ≤ 1,0 s no servidor. Relatórios pesados e PDFs assíncronos (202). Varredura diária fora do horário das clínicas.
- **Rede instável (RNF-09):** respostas enxutas e idempotência para reenvio.
- **Manutenção (RNF-10):** fora do horário das clínicas (a definir); leitura segue disponível.
- **Nova clínica (RNF-11):** entra pelo evento `org.clinic.created`, sem alteração de código. Categorias começam vazias.

### Módulo fora do ar

| Módulo | Comportamento do Estoque | Efeito para o usuário |
|---|---|---|
| IAM | Tokens válidos até expirar; JWKS em cache por 24 h; nomes do cache | Sessões ativas seguem; sem novo login |
| Organização | Dados em cache; eventos acumulam | Clínica nova aguarda provisionamento |
| Atendimento | Eventos acumulam; baixa manual por pacote segue | Baixas automáticas atrasam |
| Solicitações | Entrada avulsa segue; lead time usa o estimado | Sem conferência pedido × entregue |
| Notificações | Alertas na outbox com reenvio exponencial; painel e `GET /alerts` seguem | E-mail/WhatsApp atrasam |
| Arquivos | Nota sem anexo; upload repetido depois; PDF sob demanda | Anexo de NF e PDFs indisponíveis |
| Auditoria | Grava trilha local e replica em lote depois | Nenhum |

Timeout padrão para outros módulos: 2 s, com 2 novas tentativas e circuit breaker após 5 falhas seguidas.

## 9. Decisões em aberto

- **D1** Dono de usuários e permissões. Recomendado: IAM guarda usuário, perfil e vínculo; Estoque guarda o mapa perfil → escopos.
- **D2** Caixa de entrada e preferências. Recomendado: na plataforma.
- **D3** Catálogo de insumos. Recomendado: Estoque; Solicitações referencia por `itemId` e assina `stock.item.*`.
- **D4** Baixa por procedimento. Recomendado: proposta pendente confirmada ou ajustada pelo usuário, com confirmação automática opcional por clínica.
- **D5** Dono do cadastro de fornecedores. Hoje é texto livre nos recebimentos incorretos; com módulo de Compras, vira `supplierId`.
- **D6** Barramento de eventos. Assumido CloudEvents, pelo menos uma vez, com ordenação por chave e fila de descarte.
- **D7** Auditoria central e retenção. Se não existir, o Estoque mantém a trilha sozinho e A7 sai.
- **D8** Valores monetários. Não há; se necessários, virão de outro módulo (D10).
- **D9** SLAs entre módulos e janela de manutenção. Definir com a operação das clínicas.
- **D10** Estoque orçamentário. Conversar com a gestão antes de qualquer desenho (N-13).
- **D11** Empréstimo com prazo e controle de retorno. Hoje só registra destinatário e baixa saldo.
- **D12** "Editar categorias por clínica" assumido como categorias de insumo; as nove categorias de movimentação são fixas.
- **D13** Quem notifica a empresa fornecedora nos recebimentos incorretos. Hoje o Estoque só registra a data informada.
