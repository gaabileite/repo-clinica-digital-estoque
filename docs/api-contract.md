# Contrato de APIs: Módulo de Estoque

**Escopo:** RF-01 a RF-31, RF-36 a RF-42, RNF-01 a RNF-11 e N-01 a N-13. Transferências entre clínicas (RF-31* a RF-35) ficam para fase futura, sem endpoint reservado.

**Versão 0.12.** Nomes e prefixos dos outros módulos (iam, org, care, requests, notify, files, audit) são premissas adotadas (seção 9). Mudanças em relação à 0.11:
- As 13 decisões em aberto (D1 a D13) foram fechadas pela recomendação do contrato (seção 9).
- Perfil Controlador Orçamentário (`budget-controller`) e custo unitário por insumo: rotas E-57 a E-60 e escopos `stock:budget:*`. Substitui a posição das versões anteriores de que não haveria valores (D8 e D10).
- Campos em inglês em toda a API (o cadastro de insumo usa `name`, `categoryId`, `unit`, `recordsTemperature`, `tracksLotAndExpiry`, `estimatedLeadTimeDays` e `expiryAlertLeadDays`).
- Exportações em PDF e Excel (XLSX), no lugar de CSV e PDF.
- O módulo responde internamente em `/api/v1` (o shell encaminha `/api/v1/supplies`) e o gateway o publica como `/stock/v1`.
- Os identificadores RF deste documento seguem a numeração da versão 1 dos requisitos; os itens novos usam o prefixo V2 (numeração da v2.0). A renumeração completa fica para a versão 1.0.

## 1. Responsabilidades

| Dado | Dono | Papel do Estoque |
|---|---|---|
| Usuários, perfis, sessões | IAM | Guarda só ID, nome e perfil (cache) e o mapa perfil → escopos |
| Clínicas | Organização | Cria o tenant ao receber o evento |
| Procedimentos e execuções | Atendimento | Guarda o vínculo pacote ↔ procedimento |
| Pedidos de insumo | Solicitações | Lê o pedido e informa o recebimento |
| Alertas entregues, preferências, canais | Notificações | Só produz o alerta |
| Arquivos | Arquivos | Guarda só o fileId |
| Insumos, lotes, saldos, movimentações, pacotes, notas, recebimentos incorretos, alertas | Estoque | Fonte única do saldo |
| Trilha de auditoria | Auditoria | Mantém também o próprio livro por 5 anos |

## 2. Convenções

- **Formato:** REST/HTTPS (TLS 1.2+), JSON UTF-8, OpenAPI 3.1. Eventos em CloudEvents 1.0.
- **Base:** `/stock/v1` (no módulo, `/api/v1`).
- **Autenticação:** OAuth 2.0/OIDC, JWT Bearer. Claims: `sub`, `profile` (superuser, admin, warehouse, budget-controller), `clinic_ids`, `scope`. Entre serviços: client credentials.
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
| A7 Auditoria | Opcional (D7: o Estoque mantém a trilha sozinho) | 3 |
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

Perfis: **S** superuser, **A** administrador, **AL** almoxarife, **C** controlador orçamentário. O superuser lê todas as clínicas e não registra movimentações. "+serviço" = acesso por client credentials com escopo `stock:service`. `{c}` = `/clinics/{clinicId}`.

### Cadastros
- E-01 `GET {c}/items`: lista insumos (filtros `q`, `code`, `category`, `status`, `active`). S A AL
- E-02 `POST {c}/items`: cria insumo (`name`, `categoryId`, `unit`, `recordsTemperature`, `temperatureRange`, `tracksLotAndExpiry`, `estimatedLeadTimeDays`, `expiryAlertLeadDays`). Código `INS-0001…` gerado pelo sistema. A
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
- E-42 `GET {c}/reports/consumption`: consumo em quantidade. `groupBy`: `item`, `clinic`, `week` (os dois últimos exigem `itemId`). Aceita `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX). S A
- E-43 `GET {c}/reports/losses`: perda por validade e descarte por avaria. S A
- E-44 `GET {c}/reports/abc`: curva ABC por quantidade consumida. S A
- E-45 `POST {c}/report-exports`: exportação assíncrona PDF/Excel (XLSX). Responde 202; consulta em `/report-exports/{id}`, que devolve URL assinada. S A

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
- E-50 `GET /me/permissions`: perfil, permissões e clínicas do usuário autenticado, no formato `{ profile, permissions, clinics }` (`clinics` vazio para o superuser, que enxerga todas). Aberta a qualquer perfil autenticado, inclusive o controlador orçamentário. S A AL C

### Visão orçamentária (novo na 0.12)
Valores em reais só para o controlador e para o superuser com a chave ligada (RN-15); o servidor não entrega valores a quem não tem o escopo (RNF-05).
- E-57 `GET {c}/budget/summary`: valor em estoque (com lotes vencidos até o descarte), valor perdido dos últimos 30 dias sem estornos e consumo, em reais (V2-RF-44). C, S com a chave
- E-58 `GET {c}/budget/valuation`: valoração por insumo e por categoria; insumo sem custo vale zero (V2-RF-44). C, S com a chave
- E-59 `PUT {c}/items/{id}/cost`: custo unitário de referência; cada mudança vai para a trilha de auditoria (V2-RF-43). C
- E-60 `PUT /me/budget-view`: liga ou desliga a visão orçamentária do superuser (V2-RF-45). S

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

| Escopo | Permite | S | A | AL | C |
|---|---|---|---|---|---|
| `stock:read` | Consultar saldo, lotes, movimentações, painel, alertas | ✓ | ✓ | ✓ |  |
| `stock:network:read` | Visão consolidada | ✓ |  |  |  |
| `stock:withdraw` | Saídas e devoluções |  | ✓ | ✓ |  |
| `stock:receive` | Entradas, estorno de nota, recebimentos incorretos |  | ✓ | ✓ |  |
| `stock:adjust` | Ajuste de inventário |  | ✓ | ✓ |  |
| `stock:reverse` | Estornar movimentações |  | ✓ | ✓ |  |
| `stock:catalog:write` | Insumos, categorias, pacotes |  | ✓ |  |  |
| `stock:reports` | Relatórios, curva ABC, exportações | ✓ | ✓ |  |  |
| `stock:audit` | Trilha de auditoria | ✓ | ✓ |  |  |
| `stock:admin` | Permissões e parâmetros | ✓ |  |  |  |
| `stock:budget:read` | Telas monetárias da clínica | com chave |  |  | ✓ |
| `stock:budget:cost:write` | Custo unitário de referência |  |  |  | ✓ |
| `stock:budget:switch` | Ligar a visão orçamentária | ✓ |  |  |  |
| `stock:service` | Uso entre serviços | serviço | serviço | serviço |  |

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
- **Manutenção (RNF-10):** aos domingos, das 0h às 4h (America/Recife), fora do horário das clínicas; leitura segue disponível.
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

## 9. Decisões adotadas

Na versão 0.12 todas as decisões em aberto foram fechadas seguindo a recomendação do contrato. Se a plataforma contrariar alguma, a plataforma prevalece e o contrato é ajustado.

- **D1** Dono de usuários e permissões: o IAM guarda usuário, perfil e vínculo com clínica e os informa pelo token (claims `profile` e `clinic_ids`) e pelos eventos `iam.user.*`. O Estoque guarda o mapa perfil → escopos (RF-03) e um cache de id, nome e perfil. Não cria usuários.
- **D2** Caixa de entrada e preferências: na plataforma (A5). O Estoque só produz os alertas; não há rotas de caixa de entrada nem de preferências no Estoque. A tela de Notificações lê a plataforma por um adaptador, simulado até a API existir.
- **D3** Catálogo de insumos: do Estoque, com o código gerado por ele; Solicitações referencia por `itemId` e assina `stock.item.*`.
- **D4** Baixa por procedimento: proposta pendente que o usuário confirma ou ajusta, com a confirmação automática ligável por clínica (`autoConfirmProcedureConsumption`, desligada por padrão).
- **D5** Fornecedores: sem dono por enquanto; a empresa é texto livre (`supplier`) nos recebimentos incorretos. Com módulo de Compras, vira `supplierId`.
- **D6** Barramento de eventos: CloudEvents, pelo menos uma vez. O Estoque publica pela outbox, consome com deduplicação por `id` (`processed_events`) e, depois de 5 falhas com espera crescente, move o evento para a fila de descarte (`dead_letter_events`). Até a plataforma oferecer barramento, o despacho é simulado.
- **D7** Auditoria central: assume-se que não existe. O Estoque mantém a própria trilha por 5 anos e A7 sai. Se a plataforma criar a auditoria central, o Estoque passa a replicar para ela.
- **D8** Valores monetários: nesta fase vivem no Estoque, como custo unitário de referência por insumo (requisitos v2.0), mantido pelo controlador. Painéis e relatórios comuns seguem sem valores; só a visão orçamentária (E-57 a E-60) mostra reais. A curva ABC continua por quantidade.
- **D9** SLAs e janela de manutenção: manutenção aos domingos, 0h às 4h (America/Recife); timeouts e novas tentativas como na seção 8; disponibilidade alvo de 99,5% no horário das clínicas. Ajustar quando a operação informar o horário real.
- **D10** Estoque orçamentário: sem módulo financeiro, o Estoque entrega a visão orçamentária com custo de referência por insumo, sem orçamento previsto e sem custo por lote. Com módulo financeiro, o custo passa a vir dele.
- **D11** Empréstimo: só registra o destinatário e baixa o saldo, sem prazo nem controle de retorno.
- **D12** "Editar categorias por clínica": são as categorias de insumo; as nove de movimentação são fixas.
- **D13** Notificação à empresa fornecedora: feita pela equipe da clínica, fora do sistema. O Estoque registra a data informada e alerta aos 45 dias.

**Próximos passos:** ligar o token do IAM ao módulo (E0-H4) e trocar os adaptadores simulados (A1 a A6) pelas integrações reais quando existirem; publicar o OpenAPI gerado pela API (`openapi.json`); escrever testes de contrato para baixa por execução (A3), nota de recebimento (A4) e alertas (A5); renumerar os identificadores RF para a numeração da v2.0.
