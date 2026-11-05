# Contrato de APIs

## Módulo de Estoque

Integrações necessárias com os demais módulos da plataforma e interfaces expostas pelo Estoque

Inovação que Cuida, Transformação que Educa

- Versão; 0.11 — três perfis e nível crítico de 0 a 10; rascunho para validação
- Data; Outubro de 2026
- Base; Documento de Especificação de Requisitos do módulo de estoque (NUTES × CIn/UFPE)
- Escopo; RF-01 a RF-31, RF-36 a RF-42, RNF-01 a RNF-11 e os itens novos da reunião (N-01 a N-13). Transferências entre clínicas ficam para fase futura.

# 1. Introdução

Este documento define o contrato entre o módulo de Estoque e o restante da plataforma Clínica Digital. Responde a duas perguntas: de quais APIs de outros módulos o Estoque precisa para cumprir seus requisitos, e quais APIs o Estoque oferece aos demais módulos e ao seu próprio front-end.

O texto está organizado em oito partes: convenções comuns (2), visão da integração (3), APIs que o Estoque consome (4), APIs que o Estoque expõe (5), eventos (6), segurança e erros (7), requisitos não funcionais e resiliência (8) e a matriz de rastreabilidade (9). As decisões que dependem da arquitetura da plataforma estão reunidas na parte 10.

Premissas a validar. O documento de requisitos descreve só o módulo de estoque. Os nomes, prefixos e responsabilidades dos outros módulos (IAM, Organização, Atendimento, Solicitações, Notificações, Arquivos, Auditoria) são premissas deste rascunho, marcadas como tal. Onde a plataforma já tiver uma API equivalente, o contrato deve ser ajustado a ela e não o contrário.

### Escopo desta versão

- Dentro: cadastros (insumos, categorias por clínica, pacotes), saldo por lote e validade, nove categorias de movimentação, devolução, entradas por origem com nota de recebimento, recebimentos incorretos, alertas, relatórios, auditoria, permissões (quatro perfis) e a visão consolidada do superuser.
- Fora, fase futura: transferências entre clínicas (RF-31*, RF-32, RF-33, RF-34, RF-35). Nenhum endpoint é reservado na v1. O modelo de dados já guarda lote, validade e clínica em todo lançamento, o que permite acrescentar o fluxo depois sem quebrar este contrato.

### O que mudou em relação à versão 0.9

- Três perfis: superuser, administrador e almoxarife. O almoxarife opera o estoque (entradas, saídas, devoluções e recebimentos incorretos).
- Cadastro de insumo simplificado: código gerado pelo sistema, nome, categoria, unidade, temperatura (opcional), controle de lote e validade, tempo de reposição estimado e antecedência do alerta de validade. Saem fornecedor, classificação, mínimo, ressuprimento e preço. O nível crítico passa a ser uma nota calculada de 0 a 10, em que 10 é muito crítico (a partir de 7, o item é crítico).
- Categorias de insumo por clínica e nove categorias de movimentação, incluindo empréstimo, doação e devolução.
- Entrada por origem (almoxarifado central, outra clínica, doação externa, outro), com carta do doador e comprovante. O estorno de nota só vale se nenhum lote foi movimentado.
- Recebimentos incorretos: produto errado que o fornecedor não troca. Passados 45 dias da notificação, é incorporado ou descartado.
- Novos alertas: lote fora da validade mais próxima, retirada acima da média diária e queda de consumo em relação ao aprendido.
- Painéis sem valores: itens (e não lotes) a vencer, colunas de lotes a vencer e vencidos, consumo semanal por clínica e insumo. O almoxarife não vê gráfico nem movimentações no painel.
- Fornecedores saem do cadastro e não há valores em notas, painéis ou relatórios. O estoque orçamentário será conversado com a gestão (D10).

### Quem é dono de quê

- Usuários, perfis de acesso, senhas, sessões - Módulo dono: IAM; Papel do Estoque: Estoque guarda só o ID do usuário e um cache de nome.
- Clínicas (identificação, endereço, responsável) - Módulo dono: Organização; Papel do Estoque: Estoque cria o tenant ao receber o evento.
- Procedimentos e suas execuções - Módulo dono: Atendimento; Papel do Estoque: Estoque guarda o vínculo pacote ↔ procedimento.
- Pedidos de insumo - Módulo dono: Solicitações; Papel do Estoque: Estoque lê o pedido e informa o recebimento.
- Caixa de entrada, preferências e canais (e-mail, WhatsApp) - Módulo dono: Notificações; Papel do Estoque: Estoque envia o alerta e não entrega mensagens.
- Arquivos (carta do doador, comprovantes, PDFs, exportações) - Módulo dono: Arquivos; Papel do Estoque: Estoque guarda só o fileId.
- Insumos, categorias de insumo por clínica, lotes, saldos, movimentações, pacotes, notas de recebimento, recebimentos incorretos, alertas, permissões do módulo - Módulo dono: Estoque; Papel do Estoque: Fonte única da verdade do saldo.
- Trilha de auditoria transversal - Módulo dono: Auditoria; Papel do Estoque: Estoque mantém também o próprio livro, por 5 anos (RNF-02).

# 2. Convenções comuns

- Estilo e formato: REST sobre HTTPS (TLS 1.2 ou superior, RNF-04), JSON UTF-8. Descrição formal em OpenAPI 3.1, uma por módulo. Eventos em CloudEvents 1.0 (JSON).
- Endereço base: https://api.{plataforma}/{módulo}/v1. Para o Estoque: /stock/v1. Prefixos dos demais módulos são premissas (iam, org, care, requests, notify, files, audit).
- Autenticação: OAuth 2.0 / OpenID Connect. Token JWT no cabeçalho Authorization: Bearer. Claims usadas: sub, profile (superuser, admin, warehouse), clinic_ids (lista), scope. Chamadas entre serviços usam client credentials.
- Isolamento por clínica: Todo recurso de clínica fica sob /clinics/{clinicId}. A camada de API recusa (403) quando clinicId não está em clinic_ids, exceto para superuser, que lê todas as clínicas (RF-30, RNF-05).
- Identificadores: UUID v7 como string. O código do insumo (sku) é único por clínica e é a chave de negócio.
- Quantidades e valores: Strings decimais, sem float: "12.500". Valores monetários: {"amount":"38.90","currency":"BRL"}. A unidade vem do insumo.
- Datas: Instantes em ISO 8601 UTC (2026-10-08T14:03:00Z). Validade de lote em data civil (2026-10-08), avaliada no fuso America/Recife.
- Paginação: Por cursor: ?limit=50&cursor=…, máximo 200. Resposta: {"data":[…],"page":{"nextCursor":"…"}}. Ordenação: ?sort=-occurredAt.
- Idempotência: Cabeçalho Idempotency-Key obrigatório em todo POST que altera saldo. Mesma chave e mesmo corpo devolvem a resposta original por 72 h. Mesma chave com corpo diferente devolve 422.
- Concorrência: Cadastros usam ETag e If-Match. Versão desatualizada devolve 412.
- Rastreio: X-Request-Id gerado no primeiro ponto e propagado, mais traceparent (W3C Trace Context).
- Erros: application/problem+json (RFC 9457) com type, title, status, detail, code e errors[]. Códigos de negócio na parte 7.
- Versionamento: Versão maior no caminho (/v1). Campos opcionais novos não mudam a versão. Descontinuação com 6 meses de aviso, pelos cabeçalhos Deprecation e Sunset.
- Limites: 600 requisições por minuto por usuário. Excedido: 429 com Retry-After.

# 3. Visão da integração

O Estoque é consumidor de sete módulos e provedor para quatro tipos de cliente. Toda dependência tem comportamento definido para quando estiver fora do ar (parte 8).

(O diagrama de integração está na versão em PDF.)

### Prioridade de cada integração

Derivada da maior prioridade entre os requisitos que dependem dela.

- A1 - Módulo: Identidade e Acesso (IAM); Maior prioridade: Essencial; Impacto se faltar: Sem ela o módulo não opera; Entrega sugerida: Fase 1
- A2 - Módulo: Organização (clínicas); Maior prioridade: Essencial; Impacto se faltar: Sem ela o módulo não opera; Entrega sugerida: Fase 1
- A3 - Módulo: Atendimento (procedimentos); Maior prioridade: Essencial; Impacto se faltar: Degradação aceitável (parte 8); Entrega sugerida: Fase 2
- A4 - Módulo: Solicitações de insumo; Maior prioridade: Importante; Impacto se faltar: Degradação aceitável (parte 8); Entrega sugerida: Fase 2
- A5 - Módulo: Notificações; Maior prioridade: Essencial; Impacto se faltar: Alerta essencial depende dela; Entrega sugerida: Fase 1
- A6 - Módulo: Arquivos e documentos; Maior prioridade: Importante; Impacto se faltar: Degradação aceitável (parte 8); Entrega sugerida: Fase 3
- A7 - Módulo: Auditoria da plataforma; Maior prioridade: Essencial; Impacto se faltar: Alerta essencial depende dela; Entrega sugerida: Fase 1

Fase 1: IAM, Organização, Notificações (alertas no aplicativo) e Auditoria. Fase 2: Atendimento (baixa automática) e Solicitações (lead time medido). Fase 3: Arquivos (anexo de NF, PDFs) e canais externos de notificação.

# 4. APIs que o Estoque consome

Cada tabela lista o que o Estoque precisa do módulo e por quê. Os caminhos são relativos ao prefixo do módulo. Os códigos D-nn e V-nn são usados na matriz de rastreabilidade.

## A1 · Identidade e Acesso (IAM) /iam/v1

Autenticação, usuários e vínculo com clínicas. O Estoque não guarda senha nem credencial (RNF-03): valida tokens emitidos pelo IAM e consulta dados básicos de usuário.

- D-01 GET `/.well-known/jwks.json` - Chaves públicas para validar a assinatura dos tokens JWT, sem chamada por requisição. (Requisitos: RF-36)
- D-02 POST `/oauth/token` - Emissão de tokens: authorization code + PKCE (usuários) e client credentials (serviços, ex.: Atendimento). (Requisitos: RF-36)
- D-03 GET `/users/{userId}` - Nome, e-mail, perfil (superuser, administrador, almoxarife), clínicas vinculadas e situação. (Requisitos: RF-02, RF-37, N-02)
- D-04 GET `/users?clinicId={id}&profile={p}&status=active` - Lista usuários ativos por clínica e perfil. Resolve os destinatários dos alertas. (Requisitos: RF-24*, RF-25*, RF-28)
- D-05 POST `/users:batch-get` - Resolve até 100 IDs de uma vez, para exibir o nome do usuário no log e na auditoria. (Requisitos: RF-13, RF-37)

Eventos assinados

- V-01 - Evento: `iam.user.created | updated | deactivated`; Efeito no Estoque: Atualiza o cache local de usuários e bloqueia retiradas de usuário inativado.; Requisitos: RF-02

## A2 · Organização (clínicas) /org/v1

Dono do cadastro de clínicas da rede. O Estoque cria o espaço de dados (tenant) de uma clínica nova a partir do evento, sem alteração de código (RNF-11).

- D-06 GET `/clinics` - Lista clínicas ativas da rede (visão do superuser). (Requisitos: RF-01, RF-31)
- D-07 GET `/clinics/{clinicId}` - Identificação, endereço, responsável e situação. (Requisitos: RF-01, RF-30)

Eventos assinados

- V-02 - Evento: `org.clinic.created | updated | deactivated`; Efeito no Estoque: Provisiona (ou arquiva) o tenant de estoque da clínica.; Requisitos: RF-01, RF-30

## A3 · Atendimento (procedimentos) /care/v1

Origem da informação de que um procedimento foi executado. É o gatilho da baixa automática: o Estoque não registra atendimentos.

- D-08 GET `/procedures?clinicId={id}` - Catálogo de procedimentos, para vincular cada pacote a um procedimento (campo opcional procedureId). (Requisitos: RF-06)
- D-09 GET `/procedure-executions/{executionId}` - Clínica, procedimento, executor, data/hora e nº de atendimentos da execução. (Requisitos: RF-11)

Eventos assinados

- V-03 - Evento: `care.procedure-execution.completed`; Efeito no Estoque: Cria uma baixa pendente (proposta) com os insumos do pacote vinculado.; Requisitos: RF-11, RF-12
- V-04 - Evento: `care.procedure-execution.cancelled`; Efeito no Estoque: Estorna automaticamente a baixa gerada pela execução cancelada.; Requisitos: RF-16

## A4 · Solicitações de insumo /requests/v1

Fonte da data do pedido de cada insumo. Sem ela não há lead time medido (RF-20), e o alerta de nível crítico usa só o tempo de reposição estimado.

- D-10 GET `/requests?clinicId={id}&status=open` - Pedidos em aberto da clínica, para conferência no recebimento. (Requisitos: RF-21, RF-23)
- D-11 GET `/requests/{requestId}` - Data do pedido, fornecedor, itens e quantidades solicitadas. (Requisitos: RF-20, RF-21, RF-23)

Eventos assinados

- V-05 - Evento: `requests.request.created | approved | cancelled`; Efeito no Estoque: Mantém a lista de pedidos abertos e o cálculo de reposição em andamento.; Requisitos: RF-21

## A5 · Notificações /notify/v1

Central de notificações, preferências por usuário e canais externos. O Estoque só produz os alertas: quem entrega, agrupa e guarda o histórico é o módulo de Notificações.

- D-12 PUT `/categories/{categoryId}` - Registra as categorias de alerta do Estoque (stock.critical-level, stock.expiry, stock.lot-not-nearest, stock.high-withdrawal, stock.consumption-drop, stock.incorrect-receipt-overdue), com os perfis destinatários e os canais padrão. (Requisitos: RF-28, N-01, N-03, N-04, N-05)
- D-13 POST `/notifications` - Envia um alerta a destinatários (usuário, ou clínica + perfil), com groupKey para resumo e dedupeKey contra repetição. (Requisitos: RF-24*, RF-25*, RF-26, RF-29, N-01, N-03, N-04, N-05)
- D-14 GET `/inbox?category=stock.*` - Caixa de entrada do usuário, com histórico e marcação de lida. (Requisitos: RF-27)
- D-15 PATCH `/inbox/{id}` - Marca como lida / não lida. (Requisitos: RF-27)
- D-16 GET `/users/{userId}/preferences` - Quais alertas e por qual canal o usuário recebe. (Requisitos: RF-28)
- D-17 PUT `/users/{userId}/preferences/{categoryId}` - Altera preferência de uma categoria (app, e-mail, WhatsApp, resumo). (Requisitos: RF-28, RF-29)

## A6 · Arquivos e documentos /files/v1

Armazena anexos e documentos gerados: carta do doador e comprovante da entrada, PDF da nota de recebimento e exportações de relatório.

- D-18 POST `/files` - Upload (URL pré-assinada). Retorna fileId, tipo e hash. (Requisitos: RF-22, RF-24, RF-41, N-09)
- D-19 GET `/files/{fileId}/signed-url?ttl=300` - URL de download temporária, respeitando a clínica do arquivo. (Requisitos: RF-22, RF-24, RF-41, N-09)

## A7 · Auditoria da plataforma /audit/v1

Trilha de auditoria transversal. O Estoque mantém o próprio livro de movimentações por 5 anos e replica cadastros e operações para a trilha central.

- D-20 POST `/events:batch` - Registra até 500 eventos de auditoria (quem, o quê, quando, antes/depois) por chamada. (Requisitos: RF-37)

# 5. APIs que o Estoque expõe

Caminhos relativos a `/stock/v1`. Perfis: S superuser, A administrador, AL almoxarife. Regra geral: o superuser tem leitura em todas as clínicas e não registra movimentações. serviço: também acessível por client credentials de outro módulo, com o escopo `stock:service`. Os perfis são os padrões da matriz do RF-03 e podem ser reconfigurados.

## Cadastros

- E-01 GET `/clinics/{clinicId}/items` - Lista insumos (filtros: q, code, category, status, active). A busca por código (code=INS-0001) é a usada nas telas de retirada, devolução e entrada. (Requisitos: RF-04, N-11; Perfis: S A AL)
- E-02 POST `/clinics/{clinicId}/items` - Cria insumo: nome, categoria, unidade, registraTemperatura (com temperatura), controlaLoteValidade, tempoReposicaoEstimadoDias e antecedenciaAlertaValidadeDias. O código (INS-0001…) é gerado pelo sistema e devolvido na resposta. (Requisitos: RF-04, RF-09, N-11; Perfis: A)
- E-03 GET `/clinics/{clinicId}/items/{itemId}` - Detalhe do insumo. (Requisitos: RF-04, RF-09; Perfis: S A AL)
- E-04 PATCH `/clinics/{clinicId}/items/{itemId}` - Altera campos do insumo (If-Match obrigatório). O código não muda. (Requisitos: RF-04, RF-09; Perfis: A)
- E-05 POST `/clinics/{clinicId}/items/{itemId}/deactivate` - Inativa (ou reativa em /reactivate). Insumo com saldo não é apagado. (Requisitos: RF-04; Perfis: A)
- E-06 GET `/catalog/units` - Lista de referência de unidades de medida. (Requisitos: RF-04; Perfis: S A AL)
- E-07 GET `/clinics/{clinicId}/item-categories` - Categorias de insumo da clínica, com nº de insumos em cada uma. (Requisitos: RF-05, N-10; Perfis: S A AL)
- E-08 POST `/clinics/{clinicId}/item-categories` - Cria categoria. PATCH em /item-categories/{id} renomeia (atualiza os insumos) ou inativa (recusado se houver insumo ativo na categoria). (Requisitos: RF-05, N-10; Perfis: A)
- E-09 GET `/clinics/{clinicId}/packages` - Lista pacotes (procedimentos padrão) e seus insumos. (Requisitos: RF-06; Perfis: S A AL)
- E-10 POST `/clinics/{clinicId}/packages` - Cria pacote: nome, grupo de material, procedureId (opcional) e lista de {itemId, quantidade padrão}. (Requisitos: RF-06; Perfis: A)
- E-11 PATCH `/clinics/{clinicId}/packages/{packageId}` - Altera ou inativa pacote. (Requisitos: RF-06; Perfis: A)

## Saldo, lotes e painel

- E-12 GET `/clinics/{clinicId}/balances` - Saldo por insumo: situação (adequado, repor, crítico, sem estoque), nível crítico de 0 a 10 (10 = muito crítico, calculado pela cobertura em dias e pelo tempo de reposição), cobertura em dias, validade mais próxima (nearestExpiry) e nº de lotes vencidos. Atualiza a cada movimentação. (Requisitos: RF-19, RF-07, RF-24*, N-03; Perfis: S A AL)
- E-13 GET `/clinics/{clinicId}/items/{itemId}/lots` - Lotes com saldo em ordem de validade. O primeiro utilizável vem com suggested=true. (Requisitos: RF-14, N-03; Perfis: S A AL)
- E-14 GET `/clinics/{clinicId}/items/{itemId}/availability?quantity=` - Disponibilidade para consumo (sem lotes vencidos) e lote sugerido (suggestedLot). Uso por serviços: Atendimento, Solicitações. (Requisitos: RF-11, RF-14, N-03; Perfis: S A AL + serviço)
- E-15 GET `/clinics/{clinicId}/items/{itemId}/consumption-profile` - Consumo médio de 30 dias, média aprendida (dias 15 a 90), média dos últimos 14 dias e indicador de queda relevante. (Requisitos: N-05; Perfis: S A AL)
- E-16 GET `/clinics/{clinicId}/dashboard` - Painel por perfil. Todos: itens controlados, em nível crítico, itens a vencer e itens com lote vencido; itens críticos; validades a vencer; lotes vencidos. Administrador e superuser: também últimas movimentações. Almoxarife: só o resumo. Sem valores monetários. (Requisitos: RF-40, N-06; Perfis: S A AL)
- E-17 GET `/clinics/{clinicId}/dashboard/weekly-consumption?itemCode=&weeks=8` - Consumo semanal de um insumo, em quantidade, para o gráfico do painel. (Requisitos: RF-40, N-06; Perfis: S A)

## Saídas

- E-18 POST `/clinics/{clinicId}/withdrawals` - Retirada pelo código do insumo. kind: consumption, expiry-loss (perda por validade), damage-discard (descarte por avaria), loan (empréstimo) ou donation (doação). O servidor sugere o lote de validade mais próxima; lotId escolhe outro. loan e donation exigem recipient. A resposta traz warnings[] (LOT_NOT_NEAREST_EXPIRY, QUANTITY_ABOVE_DAILY_AVERAGE); cada aviso gera um alerta ao administrador. Idempotency-Key obrigatório. (Requisitos: RF-10, RF-13, RF-14, RF-15, N-03, N-04, N-07; Perfis: A AL)
- E-19 POST `/clinics/{clinicId}/procedure-consumptions:preview` - Dado um pacote e o nº de execuções, devolve os insumos, as quantidades padrão e a disponibilidade, sem baixar. (Requisitos: RF-06, RF-11; Perfis: A AL + serviço)
- E-20 POST `/clinics/{clinicId}/procedure-consumptions` - Confirma a baixa de um procedimento (kind consumption). Se alguma quantidade difere do padrão, justification é obrigatória. executionId opcional (idempotência por execução). (Requisitos: RF-11, RF-12, RF-13, N-07; Perfis: A AL + serviço)
- E-21 GET `/clinics/{clinicId}/pending-consumptions` - Baixas pendentes geradas a partir de execuções de procedimento (evento do Atendimento). (Requisitos: RF-11, RF-12; Perfis: A AL)
- E-22 POST `/clinics/{clinicId}/pending-consumptions/{id}/confirmation` - Confirma a proposta, com ajustes e justificativa. Em /dismissal, descarta com motivo. (Requisitos: RF-11, RF-12; Perfis: A AL)
- E-23 POST `/clinics/{clinicId}/expired-lots:write-off` - Baixa lotes vencidos como perda por validade (expiry-loss). (Requisitos: RF-14, RF-15, N-07; Perfis: A AL)
- E-24 POST `/clinics/{clinicId}/returns` - Devolução de item retirado e não utilizado: código do insumo, quantidade, lote (existente, ou novo com validade) e returnedBy (quem retirou e devolveu). A resposta traz código, quantidade, lote, validade e nome da pessoa. (Requisitos: N-08, N-07, RF-13; Perfis: A AL)
- E-25 POST `/clinics/{clinicId}/movements/{movementId}/reversals` - Estorna uma saída registrada por engano. Cria lançamento de estorno; o original permanece. (Requisitos: RF-16, N-07; Perfis: A AL)
- E-26 POST `/clinics/{clinicId}/lots/{lotId}/adjustments` - Ajuste de inventário: quantidade contada e justificativa obrigatória. (Requisitos: RF-17, N-07; Perfis: A AL)

## Entradas

- E-27 POST `/clinics/{clinicId}/receipts` - Registra a entrada. origin: central-warehouse, other-clinic (clinicId), external-donation ou other (description). external-donation exige donorLetterFileId; proofFileId (comprovante) é opcional. orderedOn, ou requestId para importar a data do pedido (não se aplica a doação). receivedOn tem hoje como padrão. Linhas: código do insumo, quantidade recebida, lote e validade. Emite a nota de recebimento. other-clinic registra apenas a origem; não abre fluxo de transferência. (Requisitos: RF-18, RF-14, RF-22, RF-23, RF-24, N-09, N-07; Perfis: A AL)
- E-28 GET `/clinics/{clinicId}/receipts` - Lista notas de recebimento (período, origem, situação). (Requisitos: RF-24; Perfis: S A AL)
- E-29 GET `/clinics/{clinicId}/receipts/{receiptId}` - Detalhe da nota: origem, datas, anexos, linhas e divergências (quando importada de requisição). (Requisitos: RF-23, RF-24; Perfis: S A AL)
- E-30 GET `/clinics/{clinicId}/receipts/{receiptId}/document` - PDF da nota de recebimento (redireciona para URL assinada do módulo de Arquivos). (Requisitos: RF-24; Perfis: S A AL)
- E-31 POST `/clinics/{clinicId}/receipts/{receiptId}/reversals` - Pede o estorno da nota. Só é aceito se nenhum item dos lotes da nota tiver sido movimentado depois da entrada; senão responde 409. (Requisitos: RF-25, N-12; Perfis: A AL)
- E-32 GET `/clinics/{clinicId}/pending-requests` - Requisições em aberto (do módulo de Solicitações), para importar a data do pedido. (Requisitos: RF-21, RF-23; Perfis: A AL)
- E-33 GET `/clinics/{clinicId}/items/{itemId}/lead-time` - Tempo de reposição médio medido (dias), nº de entradas usadas e fonte (medido ou estimado). (Requisitos: RF-20; Perfis: S A AL)

## Recebimentos incorretos

- E-34 GET `/clinics/{clinicId}/incorrect-receipts` - Produtos recebidos errados que aguardam troca, com dias desde a notificação à empresa, prazo restante e situação (aguardando, prazo vencido, trocado, incorporado, descartado). (Requisitos: N-01; Perfis: S A AL)
- E-35 POST `/clinics/{clinicId}/incorrect-receipts` - Registra o produto recebido incorretamente: descrição, quantidade, unidade, empresa fornecedora, data da notificação à empresa e observação. (Requisitos: N-01; Perfis: A AL)
- E-36 POST `/clinics/{clinicId}/incorrect-receipts/{id}/exchange` - Registra que a empresa trocou o produto. (Requisitos: N-01; Perfis: A AL)
- E-37 POST `/clinics/{clinicId}/incorrect-receipts/{id}/incorporation` - Incorpora ao estoque da clínica depois do prazo (padrão: 45 dias): código do insumo, quantidade, lote e validade. Gera uma entrada com origem “produto abandonado”. (Requisitos: N-01, N-07; Perfis: A AL)
- E-38 POST `/clinics/{clinicId}/incorrect-receipts/{id}/disposal` - Descarta depois do prazo, com justificativa. Não baixa saldo, pois o produto nunca entrou no estoque. (Requisitos: N-01; Perfis: A AL)

## Movimentações e auditoria

- E-39 GET `/clinics/{clinicId}/movements` - Livro de movimentações (cursor). Filtros: itemId, code, kind (consumption, expiry-loss, damage-discard, loan, donation, entry, reversal, inventory-adjustment, return), userId, from, to, lot. Retenção mínima de 5 anos. (Requisitos: RF-13, N-07; Perfis: S A AL)
- E-40 GET `/clinics/{clinicId}/audit-trail` - Trilha de auditoria do módulo, incluindo cadastros (quem, o quê, antes/depois). (Requisitos: RF-37; Perfis: S A)

## Alertas

- E-41 GET `/clinics/{clinicId}/alerts` - Condições de alerta vigentes: critical-level, expiry, lot-not-nearest, high-withdrawal, consumption-drop e incorrect-receipt-overdue. O usuário vê os tipos do seu perfil. (Requisitos: RF-24*, RF-25*, N-01, N-03, N-04, N-05; Perfis: S A AL)

## Relatórios

- E-42 GET `/clinics/{clinicId}/reports/consumption` - Consumo em quantidade, por período. groupBy: item, clinic ou week (clinic e week exigem itemId, porque unidades diferentes não se somam). Aceita Accept: text/csv. (Requisitos: RF-38, RF-41; Perfis: S A)
- E-43 GET `/clinics/{clinicId}/reports/losses` - Perda por validade e descarte por avaria, com lote, quantidade e motivo. (Requisitos: RF-39, RF-41; Perfis: S A)
- E-44 GET `/clinics/{clinicId}/reports/abc` - Curva ABC por quantidade consumida, com % acumulado e classe. (Requisitos: RF-42, RF-41; Perfis: S A)
- E-45 POST `/clinics/{clinicId}/report-exports` - Exportação assíncrona em CSV ou PDF. Responde 202; consulta em /report-exports/{id}, que devolve a URL assinada. (Requisitos: RF-41; Perfis: S A)

## Visão da rede (superuser)

- E-46 GET `/network/dashboard` - Situação por clínica: itens, em nível crítico, lotes a vencer e lotes vencidos, mais os mesmos indicadores consolidados. (Requisitos: RF-31, RF-40, N-06; Perfis: S)
- E-47 GET `/network/balances?code=` - Saldo de um código de insumo em todas as clínicas. (Requisitos: RF-31; Perfis: S)
- E-48 GET `/network/weekly-consumption?clinicId=&itemCode=&weeks=8` - Consumo semanal de um insumo, filtrado por clínica (ou toda a rede). (Requisitos: RF-31, RF-40, N-06; Perfis: S)
- E-49 GET `/network/reports/{consumption|losses|abc}` - Os mesmos relatórios, consolidados e com a dimensão clínica. (Requisitos: RF-31, RF-38, RF-39, RF-42; Perfis: S)

## Permissões e configuração

- E-50 GET `/me/permissions` - Permissões efetivas do usuário autenticado e clínicas acessíveis. (Requisitos: RF-03, RF-30, N-02; Perfis: S A AL)
- E-51 GET `/roles` - Perfis do módulo (superuser, administrador, almoxarife) e suas permissões. (Requisitos: RF-03, N-02; Perfis: S)
- E-52 PUT `/roles/{role}/permissions` - Substitui as permissões de um perfil. (Requisitos: RF-03, N-02; Perfis: S)
- E-53 GET `/settings` - Parâmetros: safetyMarginPercent (nível crítico), highWithdrawalMultiplier (retirada alta), consumptionDropPercent (queda de consumo) e incorrectReceiptDeadlineDays (45). (Requisitos: RF-24*, N-01, N-04, N-05; Perfis: S)
- E-54 PUT `/settings` - Altera os parâmetros do módulo. (Requisitos: RF-24*, N-01, N-04, N-05; Perfis: S)

## Serviço (uso interno)

- E-55 PUT `/internal/clinics/{clinicId}` - Provisiona o tenant de estoque quando a clínica é criada (chamado pelo consumidor do evento org.clinic.created). (Requisitos: RF-01; Perfis: serviço)
- E-56 POST `/internal/jobs/daily-scan` - Varredura diária: validade, consumo aprendido e prazo dos recebimentos incorretos. Chamado pelo agendador da plataforma. (Requisitos: RF-25*, N-01, N-05; Perfis: serviço)

## Exemplos

### Entrada por doação externa, com carta do doador (E-27)

```
POST /stock/v1/clinics/0192f3c4-aa01-7c10-9d2e-5b1e0c4f7a11/receipts
Idempotency-Key: 6f1c0e0a-7b53-4a8e-9a3f-2f8d5b2c9e01

{
  "origin": { "type": "external-donation", "description": "Associação de Amigos da Fisioterapia" },
  "donorLetterFileId": "0192f3c4-c9a0-7f01-b2aa-6a4c8e1d0f55",
  "proofFileId": null,
  "orderedOn": null,
  "receivedOn": "2026-10-22",
  "lines": [{ "code": "INS-0009", "receivedQuantity": "2", "lot": "GE-13", "expiresOn": "2027-07-29" }]
}

201 Created
{ "id": "0192f3c4-e001-7b11-a1c2-3d4e5f607182", "number": "NR-0008", "status": "completed",
  "origin": { "type": "external-donation" }, "divergences": [],
  "document": "/stock/v1/clinics/…/receipts/0192f3c4-e001-…/document" }
```

### Entrada importando uma requisição, com divergência

```
{ "origin": { "type": "central-warehouse" }, "requestId": "SOL-1042", "receivedOn": "2026-10-22",
  "lines": [{ "code": "INS-0001", "receivedQuantity": "18", "lot": "LT-2500", "expiresOn": "2027-10-22" }] }

201 Created
{ "number": "NR-0009", "orderedOn": "2026-10-17",
  "divergences": [{ "line": 0, "orderedQuantity": "20", "receivedQuantity": "18", "difference": "-2" }] }
```

### Retirada de um lote que não é o de validade mais próxima (E-18)

```
POST /stock/v1/clinics/{clinicId}/withdrawals
Idempotency-Key: 0a9e3b7c-41d2-4c6f-8e11-5d7a2f9b3c10

{ "code": "INS-0005", "kind": "consumption", "quantity": "1", "lotId": "0192f3c4-5577-7a10-8c2d-9e0f1a2b3c4d" }

201 Created
{
  "movements": [{ "id": "0192f3c5-0001-7d00-9a11-2b3c4d5e6f70", "lot": "AN-577", "quantity": "-1",
                  "kind": "consumption", "occurredAt": "2026-10-22T14:03:00Z" }],
  "suggestedLot": { "lot": "AN-560", "expiresOn": "2026-11-03" },
  "warnings": [{ "code": "LOT_NOT_NEAREST_EXPIRY",
                 "message": "O lote AN-560 vence antes (2026-11-03). O administrador foi notificado." }]
}
```

### Devolução de item retirado e não utilizado (E-24)

```
POST /stock/v1/clinics/{clinicId}/returns
{ "code": "INS-0002", "quantity": "1", "lot": { "id": "0192f3c4-6001-…" }, "returnedBy": "0192f3c1-0007-…" }
(lote novo: "lot": { "lot": "LT-2500", "expiresOn": "2027-10-22" })

201 Created
{ "code": "INS-0002", "quantity": "1", "lot": "LT-2390", "expiresOn": "2027-08-04",
  "returnedBy": { "id": "0192f3c1-0007-…", "name": "Carlos Mendes" } }
```

### Baixa de procedimento com quantidade ajustada (E-20)

```
POST /stock/v1/clinics/{clinicId}/procedure-consumptions
Idempotency-Key: 5b8d1e22-90a3-4f77-a6c1-7e0d3f2b8a44

{ "packageId": "0192f3c4-7001-…", "executionId": "0192f3b9-3300-…", "executions": 1,
  "lines": [ { "itemId": "…gaze…", "quantity": "3", "defaultQuantity": "2" } ] }

422 Unprocessable Content
{ "type": "https://api.{plataforma}/problems/stock/justification-required",
  "title": "Justificativa obrigatória", "status": 422, "code": "STOCK_JUSTIFICATION_REQUIRED",
  "detail": "A quantidade de 1 linha difere do padrão do pacote.",
  "errors": [ { "line": 0, "field": "justification" } ] }

(reenvio com "justification": "Paciente com ferida extensa" → 201 Created)
```

### Estorno de nota recusado (E-31)

```
POST /stock/v1/clinics/{clinicId}/receipts/{receiptId}/reversals
{ "reason": "Nota lançada em duplicidade" }

409 Conflict
{ "type": "https://api.{plataforma}/problems/stock/receipt-lot-moved",
  "title": "Lote da nota já movimentado", "status": 409, "code": "STOCK_RECEIPT_LOT_MOVED",
  "detail": "O lote GZ-117 já tem movimentação depois da entrada.",
  "errors": [ { "line": 0, "lot": "GZ-117", "lastMovement": { "kind": "consumption", "at": "2026-10-14T14:00:00Z" } } ] }
```

### Incorporação antes do prazo (E-37)

```
POST /stock/v1/clinics/{clinicId}/incorrect-receipts/{id}/incorporation
{ "code": "INS-0006", "quantity": "4", "lot": "RS-ABD", "expiresOn": "2027-05-10" }

409 Conflict
{ "type": "https://api.{plataforma}/problems/stock/deadline-not-reached",
  "title": "Prazo de espera não vencido", "status": 409, "code": "STOCK_DEADLINE_NOT_REACHED",
  "detail": "A empresa foi notificada há 20 dias. Faltam 25 para os 45 dias de espera." }
```

# 6. Eventos

Eventos em CloudEvents 1.0, com as extensões `clinicid` e `correlationid`. Entrega pelo menos uma vez: o consumidor trata duplicatas pelo campo `id`. A ordem é garantida por `subject` (clínica + insumo). O Estoque publica com outbox transacional, de modo que um lançamento e seu evento nunca divergem. Mensagens que falham em 5 tentativas vão para fila de descarte, retida por 7 dias.

### Assinados pelo Estoque (consumidos)

- V-01 - Evento: `iam.user.created | updated | deactivated`; Origem: Identidade e Acesso (IAM); Efeito: Atualiza o cache local de usuários e bloqueia retiradas de usuário inativado.; Requisitos: RF-02
- V-02 - Evento: `org.clinic.created | updated | deactivated`; Origem: Organização (clínicas); Efeito: Provisiona (ou arquiva) o tenant de estoque da clínica.; Requisitos: RF-01, RF-30
- V-03 - Evento: `care.procedure-execution.completed`; Origem: Atendimento (procedimentos); Efeito: Cria uma baixa pendente (proposta) com os insumos do pacote vinculado.; Requisitos: RF-11, RF-12
- V-04 - Evento: `care.procedure-execution.cancelled`; Origem: Atendimento (procedimentos); Efeito: Estorna automaticamente a baixa gerada pela execução cancelada.; Requisitos: RF-16
- V-05 - Evento: `requests.request.created | approved | cancelled`; Origem: Solicitações de insumo; Efeito: Mantém a lista de pedidos abertos e o cálculo de reposição em andamento.; Requisitos: RF-21

### Publicados pelo Estoque

- P-01 - Evento: `stock.item.created | updated | deactivated`; Conteúdo: Mudança no catálogo de insumos. Solicitações usa para referenciar o insumo certo.; Consumidores previstos: Solicitações, Atendimento; Requisitos: RF-04, N-11
- P-02 - Evento: `stock.movement.recorded`; Conteúdo: Cada lançamento no livro de movimentações, com a categoria (consumption, expiry-loss, damage-discard, loan, donation, entry, reversal, inventory-adjustment, return).; Consumidores previstos: BI da plataforma, Auditoria; Requisitos: RF-13, RF-37, N-07
- P-03 - Evento: `stock.consumption.confirmed | rejected`; Conteúdo: Resultado da baixa gerada por uma execução de procedimento (inclui motivo da rejeição, ex.: saldo insuficiente).; Consumidores previstos: Atendimento; Requisitos: RF-11, RF-12
- P-04 - Evento: `stock.receipt.completed | reversed`; Conteúdo: Recebimento concluído ou estornado, com origem, itens, quantidades recebidas e data de recebimento.; Consumidores previstos: Solicitações (baixa a requisição), BI; Requisitos: RF-20, RF-23, RF-24, RF-25, N-09, N-12
- P-05 - Evento: `stock.alert.raised | cleared`; Conteúdo: Alerta aberto ou resolvido. kind: critical-level, expiry, lot-not-nearest, high-withdrawal, consumption-drop.; Consumidores previstos: Notificações (via API), painel, BI; Requisitos: RF-24*, RF-25*, N-03, N-04, N-05
- P-06 - Evento: `stock.incorrect-receipt.overdue`; Conteúdo: Prazo vencido (45 dias da notificação à empresa) sem troca: pede decisão entre incorporar e descartar.; Consumidores previstos: Notificações (via API), painel; Requisitos: N-01

### Exemplo de evento recebido: execução de procedimento

```
{
  "specversion": "1.0",
  "id": "0192f3b9-3301-7c20-8d4e-6f5a4b3c2d10",
  "source": "/care",
  "type": "care.procedure-execution.completed",
  "subject": "clinic/0192f3c4-aa01-…/execution/0192f3b9-3300-…",
  "time": "2026-10-08T13:55:12Z",
  "clinicid": "0192f3c4-aa01-7c10-9d2e-5b1e0c4f7a11",
  "correlationid": "7d0c1e5a-2b44-4c9f-b1f0-6a7e8d9c0b12",
  "datacontenttype": "application/json",
  "data": { "executionId": "0192f3b9-3300-…", "procedureId": "0192f3a0-1200-…",
            "performedBy": "0192f3c1-0007-…", "performedAt": "2026-10-08T13:50:00Z", "attendances": 4 }
}
```

### Exemplo de evento publicado: alerta de nível crítico

```
{
  "specversion": "1.0", "id": "0192f3c6-7a10-7e00-a001-1b2c3d4e5f60", "source": "/stock",
  "type": "stock.alert.raised", "subject": "clinic/0192f3c4-aa01-…/item/0192f3c4-d210-…",
  "time": "2026-10-08T14:03:01Z", "clinicid": "0192f3c4-aa01-…",
  "data": { "kind": "critical-level", "sku": "LUV-M", "usable": "3", "criticalLevel": 9,
            "coverageDays": "2.4", "leadTimeDays": "7.0", "leadTimeSource": "measured" }
}
```

### Exemplo de chamada ao módulo de Notificações

```
POST /notify/v1/notifications
{ "category": "stock.critical-level",
  "recipients": { "clinicId": "0192f3c4-aa01-…", "profiles": ["admin", "warehouse"] },
  "title": "Nível crítico: Luva de procedimento M (cx 100)",
  "body": "Nível crítico 9 de 10: cobertura de 2,4 dias para um tempo de reposição de 7 dias (saldo utilizável de 3 cx).",
  "link": "/stock/items/0192f3c4-d210-…",
  "dedupeKey": "critical:0192f3c4-d210-…",
  "groupKey": "stock.critical-level:0192f3c4-aa01-…" }
```

# 7. Segurança, permissões e erros

### Escopos de acesso do módulo

A matriz abaixo é o padrão do protótipo e vira dado configurável pelo RF-03 (`PUT /roles/{role}/permissions`).

- `stock:read` - Permite: Consultar saldo, lotes, movimentações, painel e alertas da própria clínica; Superuser: ✓; Administrador: ✓; Almoxarife: ✓
- `stock:network:read` - Permite: Consultar todas as clínicas (visão consolidada); Superuser: ✓
- `stock:withdraw` - Permite: Registrar saídas (consumo, pacote, descarte, perda por validade, empréstimo, doação) e devoluções; Administrador: ✓; Almoxarife: ✓
- `stock:receive` - Permite: Registrar entradas, pedir estorno de nota e tratar recebimentos incorretos; Administrador: ✓; Almoxarife: ✓
- `stock:adjust` - Permite: Ajuste de inventário; Administrador: ✓; Almoxarife: ✓
- `stock:reverse` - Permite: Estornar movimentações; Administrador: ✓; Almoxarife: ✓
- `stock:catalog:write` - Permite: Cadastrar e alterar insumos, categorias da clínica e pacotes; Administrador: ✓
- `stock:reports` - Permite: Relatórios, curva ABC e exportações; Superuser: ✓; Administrador: ✓
- `stock:audit` - Permite: Trilha de auditoria; Superuser: ✓; Administrador: ✓
- `stock:admin` - Permite: Permissões por perfil e parâmetros do módulo; Superuser: ✓
- `stock:service` - Permite: Uso entre serviços (disponibilidade, baixa por execução, provisionamento, varredura diária); Superuser: serviço; Administrador: serviço; Almoxarife: serviço

### Proteção de dados

- O Estoque guarda do usuário apenas ID, nome e perfil (cache do IAM). Não guarda e-mail, telefone nem documento (RNF-06).
- Logs de acesso não registram corpo de requisição. Justificativas são texto livre e entram no livro de movimentações, que é retido por 5 anos (RNF-02). A base legal e a retenção precisam ser confirmadas com o encarregado de dados.
- Toda entrega de arquivo usa URL assinada de curta duração (300 s).

### Códigos de erro de negócio

- `STOCK_INSUFFICIENT` - HTTP: 422; Quando: Saldo utilizável menor que o solicitado (lotes vencidos não contam).
- `STOCK_LOT_EXPIRED` - HTTP: 422; Quando: Tentativa de consumir lote vencido. Use a perda por validade.
- `STOCK_LOT_REQUIRED` - HTTP: 422; Quando: Insumo com controle de lote sem lote ou validade na entrada ou na devolução.
- `STOCK_CODE_NOT_FOUND` - HTTP: 404; Quando: Código de insumo inexistente na clínica.
- `STOCK_RECIPIENT_REQUIRED` - HTTP: 422; Quando: Empréstimo ou doação sem destinatário.
- `STOCK_DONOR_LETTER_REQUIRED` - HTTP: 422; Quando: Entrada por doação externa sem a carta do doador.
- `STOCK_JUSTIFICATION_REQUIRED` - HTTP: 422; Quando: Ajuste de quantidade, de inventário ou descarte sem justificativa.
- `STOCK_RECEIPT_LOT_MOVED` - HTTP: 409; Quando: Estorno de nota recusado: algum lote da nota já foi movimentado.
- `STOCK_DEADLINE_NOT_REACHED` - HTTP: 409; Quando: Incorporação ou descarte de recebimento incorreto antes do prazo (45 dias).
- `STOCK_CATEGORY_IN_USE` - HTTP: 409; Quando: Inativação de categoria que ainda tem insumos ativos.
- `STOCK_REVERSAL_NOT_ALLOWED` - HTTP: 409; Quando: Movimentação já estornada ou de uma categoria que não admite estorno.
- `STOCK_ITEM_INACTIVE` - HTTP: 422; Quando: Operação em insumo inativo.
- `STOCK_CLINIC_FORBIDDEN` - HTTP: 403; Quando: Usuário sem vínculo com a clínica do recurso.
- `STOCK_DEPENDENCY_UNAVAILABLE` - HTTP: 503; Quando: Módulo necessário fora do ar e sem alternativa (ex.: IAM na primeira autenticação).
- `IDEMPOTENCY_CONFLICT` - HTTP: 422; Quando: Idempotency-Key reutilizada com corpo diferente.
- `PRECONDITION_FAILED` - HTTP: 412; Quando: If-Match desatualizado.

# 8. Requisitos não funcionais e resiliência

- RNF-01, 02 - Como o contrato atende: Livro de movimentações imutável: usuário, instante, item, lote, quantidade, categoria, motivo, origem. Retenção mínima de 5 anos. Correções sempre por lançamento de estorno ou ajuste.; Itens: E-39, P-02
- RNF-03 - Como o contrato atende: Senhas e hash ficam no IAM. O Estoque nunca recebe credencial.; Itens: D-02
- RNF-04 - Como o contrato atende: HTTPS obrigatório (TLS 1.2+), HSTS no gateway.; Itens: Todas
- RNF-05 - Como o contrato atende: Autorização por perfil (escopos) e por vínculo com a clínica (claim clinic_ids), aplicada em cada chamada.; Itens: Todas
- RNF-06 - Como o contrato atende: Dados pessoais mínimos (parte 7). Base legal e retenção a definir.; Itens: D-03, D-05
- RNF-07 - Como o contrato atende: Backup automático do banco e do livro de movimentações, com restauração testada. Meta a definir pela plataforma (RPO e RTO).
- RNF-08 - Como o contrato atende: Consultas e registros com p95 ≤ 1,0 s no servidor, para caber nos 2 s fim a fim. Relatórios pesados e PDFs são assíncronos (202). A varredura diária (validade, consumo aprendido, prazo de 45 dias) roda fora do horário das clínicas.; Itens: E-12, E-18, E-27, E-45
- RNF-09 - Como o contrato atende: Respostas enxutas (paginação, campos essenciais) e idempotência, para uso em celular com rede instável: o app pode reenviar o mesmo POST.; Itens: Idempotency-Key
- RNF-10 - Como o contrato atende: Janela de manutenção fora do horário das clínicas (a definir). Durante a janela, leitura permanece disponível.
- RNF-11 - Como o contrato atende: Nova clínica entra pelo evento org.clinic.created, sem alteração de código nem implantação. As categorias de insumo da clínica começam vazias e são editáveis.; Itens: V-02, E-55

### Se um módulo estiver fora do ar

- IAM - Comportamento do Estoque: Tokens já emitidos continuam válidos até expirar (JWKS em cache por 24 h). Nomes de usuário vêm do cache local. Sem IAM não há novo login.; Efeito para o usuário: Leitura e registro continuam para sessões ativas.
- Organização - Comportamento do Estoque: Dados de clínica em cache. Eventos acumulam na fila.; Efeito para o usuário: Nenhuma. Clínica nova aguarda o provisionamento.
- Atendimento - Comportamento do Estoque: Eventos acumulam. A baixa manual por pacote continua disponível.; Efeito para o usuário: Baixas automáticas atrasam; nada se perde.
- Solicitações - Comportamento do Estoque: Entrada avulsa (sem pedido) continua possível; lead time usa o tempo de reposição estimado.; Efeito para o usuário: Sem conferência pedido × entregue.
- Notificações - Comportamento do Estoque: Alertas ficam na outbox com reenvio exponencial. O painel e GET /alerts mostram as condições vigentes.; Efeito para o usuário: Alertas por e-mail ou WhatsApp atrasam; o painel não.
- Arquivos - Comportamento do Estoque: A nota é registrada sem anexo e o upload é repetido depois. O PDF da nota é gerado sob demanda.; Efeito para o usuário: Anexo de NF e exportações PDF ficam indisponíveis.
- Auditoria - Comportamento do Estoque: O Estoque grava a trilha local primeiro e replica depois, em lote.; Efeito para o usuário: Nenhuma.

Tempo limite padrão de chamadas a outros módulos: 2 s, com 2 novas tentativas e disjuntor (circuit breaker) após 5 falhas seguidas.

# 9. Matriz de rastreabilidade

Gerada a partir das tabelas acima: cada requisito funcional e cada item novo da reunião (N-nn) aponta para os itens que o atendem. D = API consumida, V = evento assinado, E = API exposta, P = evento publicado. Requisitos de cadastro de clínicas, usuários e autenticação (RF-01, RF-02, RF-36) são atendidos por outro módulo, não pelo Estoque.

- RF-01 - Descrição: Cadastro de clínicas; Prioridade: Essencial; Exposta pelo Estoque: E-55; Consumida de outro módulo: D-06, D-07, V-02
- RF-02 - Descrição: Cadastro de usuários; Prioridade: Essencial; Consumida de outro módulo: D-03, V-01
- RF-03 - Descrição: Configuração de permissões; Prioridade: Essencial; Exposta pelo Estoque: E-50, E-51, E-52
- RF-04 - Descrição: Cadastro de insumos; Prioridade: Essencial; Exposta pelo Estoque: E-01, E-02, E-03, E-04, E-05, E-06, P-01
- RF-05 - Descrição: Classificação de insumos; Prioridade: Essencial; Exposta pelo Estoque: E-07, E-08; Observação: Prioridade, criticidade e classe saíram do cadastro. Resta a categoria, própria de cada clínica.
- RF-06 - Descrição: Cadastro de pacote; Prioridade: Essencial; Exposta pelo Estoque: E-09, E-10, E-11, E-19; Consumida de outro módulo: D-08
- RF-07 - Descrição: Cadastro de nível crítico; Prioridade: Essencial; Exposta pelo Estoque: E-12; Observação: Nível crítico passou a ser uma nota calculada de 0 a 10 (10 = muito crítico). Não há mínimo nem ressuprimento digitados.
- RF-08 - Descrição: Cadastro de fornecedores; Prioridade: Desejável; Observação: Fora do cadastro. A empresa fornecedora aparece só nos recebimentos incorretos.
- RF-09 - Descrição: Antecedência de alertas; Prioridade: Desejável; Exposta pelo Estoque: E-02, E-03, E-04
- RF-10 - Descrição: Retirada manual de insumos; Prioridade: Essencial; Exposta pelo Estoque: E-18
- RF-11 - Descrição: Baixa automática de insumos; Prioridade: Desejável; Exposta pelo Estoque: E-14, E-19, E-20, E-21, E-22, P-03; Consumida de outro módulo: D-09, V-03
- RF-12 - Descrição: Ajuste de quantidades sem baixa; Prioridade: Importante; Exposta pelo Estoque: E-20, E-21, E-22, P-03; Consumida de outro módulo: V-03
- RF-13 - Descrição: Log de movimentações; Prioridade: Essencial; Exposta pelo Estoque: E-18, E-20, E-24, E-39, P-02; Consumida de outro módulo: D-05
- RF-14 - Descrição: Controle de itens por lote e validade; Prioridade: Essencial; Exposta pelo Estoque: E-13, E-14, E-18, E-23, E-27
- RF-15 - Descrição: Perdas e descartes; Prioridade: Importante; Exposta pelo Estoque: E-18, E-23
- RF-16 - Descrição: Baixa acidental (estorno); Prioridade: Importante; Exposta pelo Estoque: E-25; Consumida de outro módulo: V-04
- RF-17 - Descrição: Ajuste de inventário; Prioridade: Importante; Exposta pelo Estoque: E-26
- RF-18 - Descrição: Adição manual de itens; Prioridade: Sem prioridade; Exposta pelo Estoque: E-27
- RF-19 - Descrição: Relatório de produtos; Prioridade: Essencial; Exposta pelo Estoque: E-12
- RF-20 - Descrição: Cálculo de lead time; Prioridade: Importante; Exposta pelo Estoque: E-33, P-04; Consumida de outro módulo: D-11
- RF-21 - Descrição: Solicitações de insumo; Prioridade: Desejável; Exposta pelo Estoque: E-32; Consumida de outro módulo: D-10, D-11, V-05
- RF-22 - Descrição: Fornecedor e nota fiscal na entrada; Prioridade: Desejável; Exposta pelo Estoque: E-27; Consumida de outro módulo: D-18, D-19; Observação: Fornecedor e nota fiscal substituídos por origem da entrada e comprovante opcional.
- RF-23 - Descrição: Double check de incremento; Prioridade: Desejável; Exposta pelo Estoque: E-27, E-29, E-32, P-04; Consumida de outro módulo: D-10, D-11; Observação: Conferência pedido × recebido só quando a entrada importa uma requisição.
- RF-24 - Descrição: Nota de recebimento; Prioridade: Importante; Exposta pelo Estoque: E-27, E-28, E-29, E-30, P-04; Consumida de outro módulo: D-18, D-19; Observação: Nota sem valor total.
- RF-25 - Descrição: Estorno da nota de recebimento; Prioridade: Importante; Exposta pelo Estoque: E-31, P-04
- RF-24* - Descrição: Notificação de nível crítico; Prioridade: Essencial; Exposta pelo Estoque: E-12, E-41, E-53, E-54, P-05; Consumida de outro módulo: D-04, D-13
- RF-25* - Descrição: Notificação de validade; Prioridade: Essencial; Exposta pelo Estoque: E-41, E-56, P-05; Consumida de outro módulo: D-04, D-13
- RF-26 - Descrição: Notificação externa (e-mail/WhatsApp); Prioridade: Desejável; Consumida de outro módulo: D-13
- RF-27 - Descrição: Central de notificações interna; Prioridade: Importante; Consumida de outro módulo: D-14, D-15
- RF-28 - Descrição: Preferência de notificações; Prioridade: Importante; Consumida de outro módulo: D-04, D-12, D-16, D-17
- RF-29 - Descrição: Agrupamento de notificações; Prioridade: Desejável; Consumida de outro módulo: D-13, D-17
- RF-30 - Descrição: Privacidade de dados entre clínicas; Prioridade: Essencial; Exposta pelo Estoque: E-50; Consumida de outro módulo: D-07, V-02
- RF-31 - Descrição: Permissões do superuser (visão consolidada); Prioridade: Essencial; Exposta pelo Estoque: E-46, E-47, E-48, E-49; Consumida de outro módulo: D-06
- RF-36 - Descrição: Autenticação por usuário e senha; Prioridade: Essencial; Consumida de outro módulo: D-01, D-02
- RF-37 - Descrição: Auditoria de dados; Prioridade: Essencial; Exposta pelo Estoque: E-40, P-02; Consumida de outro módulo: D-03, D-05, D-20
- RF-38 - Descrição: Relatórios de consumo; Prioridade: Importante; Exposta pelo Estoque: E-42, E-49
- RF-39 - Descrição: Relatório de perdas; Prioridade: Importante; Exposta pelo Estoque: E-43, E-49
- RF-40 - Descrição: Painel de controle; Prioridade: Essencial; Exposta pelo Estoque: E-16, E-17, E-46, E-48; Observação: Painel revisto: itens a vencer e vencidos, sem valores, por perfil.
- RF-41 - Descrição: Export de relatórios (CSV e PDF); Prioridade: Desejável; Exposta pelo Estoque: E-42, E-43, E-44, E-45; Consumida de outro módulo: D-18, D-19
- RF-42 - Descrição: Curva ABC; Prioridade: Desejável; Exposta pelo Estoque: E-44, E-49; Observação: Por quantidade consumida (não há preço no cadastro).
- RF-31*; Compartilhamento de estoque entre clínicas; Fase futura. Sem API nesta versão.
- RF-32; Notificação do superuser (excedente × falta); Fase futura. Sem API nesta versão.
- RF-33; Transferência de insumos entre clínicas; Fase futura. Sem API nesta versão.
- RF-34; Integridade da transferência; Fase futura. Sem API nesta versão.
- RF-35; Caráter da transferência (em trânsito); Fase futura. Sem API nesta versão.
- N-01 - Descrição: Recebimentos incorretos (produto abandonado, prazo de 45 dias); Prioridade: Novo; Exposta pelo Estoque: E-34, E-35, E-36, E-37, E-38, E-41, E-53, E-54, E-56, P-06; Consumida de outro módulo: D-12, D-13
- N-02 - Descrição: Perfil almoxarife (opera o estoque); três perfis no total; Prioridade: Novo; Exposta pelo Estoque: E-50, E-51, E-52; Consumida de outro módulo: D-03
- N-03 - Descrição: Validade mais próxima em destaque e alerta de lote fora da ordem; Prioridade: Novo; Exposta pelo Estoque: E-12, E-13, E-14, E-18, E-41, P-05; Consumida de outro módulo: D-12, D-13
- N-04 - Descrição: Alerta de retirada acima da média diária; Prioridade: Novo; Exposta pelo Estoque: E-18, E-41, E-53, E-54, P-05; Consumida de outro módulo: D-12, D-13
- N-05 - Descrição: Aprendizado do consumo e alerta de queda; Prioridade: Novo; Exposta pelo Estoque: E-15, E-41, E-53, E-54, E-56, P-05; Consumida de outro módulo: D-12, D-13
- N-06 - Descrição: Painéis por perfil, sem valores; Prioridade: Novo; Exposta pelo Estoque: E-16, E-17, E-46, E-48
- N-07 - Descrição: Nove categorias de movimentação; Prioridade: Novo; Exposta pelo Estoque: E-18, E-20, E-23, E-24, E-25, E-26, E-27, E-37, E-39, P-02
- N-08 - Descrição: Devolução de item retirado e não utilizado; Prioridade: Novo; Exposta pelo Estoque: E-24
- N-09 - Descrição: Entrada por origem, com carta do doador e comprovante; Prioridade: Novo; Exposta pelo Estoque: E-27, P-04; Consumida de outro módulo: D-18, D-19
- N-10 - Descrição: Categorias de insumo editáveis por clínica; Prioridade: Novo; Exposta pelo Estoque: E-07, E-08
- N-11 - Descrição: Cadastro de insumo com código gerado pelo sistema; Prioridade: Novo; Exposta pelo Estoque: E-01, E-02, P-01
- N-12 - Descrição: Estorno de nota só se nenhum lote foi movimentado; Prioridade: Novo; Exposta pelo Estoque: E-31, P-04
- N-13; Estoque orçamentário (a discutir com a gestão); Novo; A conversar com a gestão. Sem API nesta versão.

# 10. Decisões em aberto e próximos passos

- D1 - Decisão: Quem é dono de usuários e permissões (RF-02, RF-03)?; Recomendação e efeito no contrato: Recomendado: o IAM guarda usuário, perfil e vínculo com clínica; o Estoque guarda o mapa perfil → escopos do módulo (RF-03). Se o IAM já tiver papéis por módulo, a parte 7 passa a ser configuração dele.
- D2 - Decisão: Caixa de entrada e preferências ficam no Estoque ou na plataforma (RF-27, RF-28)?; Recomendação e efeito no contrato: Recomendado: na plataforma. Um usuário com vários módulos precisa de uma só caixa de entrada e de um só lugar para as preferências.
- D3 - Decisão: Quem é dono do catálogo de insumos?; Recomendação e efeito no contrato: Recomendado: o Estoque, com código gerado por ele. O módulo de Solicitações referencia insumos pelo itemId e assina stock.item.*.
- D4 - Decisão: A baixa por procedimento é automática ou confirmada pelo usuário (RF-11, RF-12)?; Recomendação e efeito no contrato: Recomendado: proposta pendente que o usuário confirma ou ajusta, com opção de confirmação automática por clínica. É o que permite cumprir o RF-12.
- D5 - Decisão: Quem é dono do cadastro de empresas fornecedoras?; Recomendação e efeito no contrato: O fornecedor saiu do cadastro de insumos e das entradas. Hoje a empresa é texto livre nos recebimentos incorretos. Se existir módulo de Compras, o campo passa a ser um supplierId.
- D6 - Decisão: Qual o barramento de eventos da plataforma?; Recomendação e efeito no contrato: O contrato assume CloudEvents e entrega pelo menos uma vez. O Estoque precisa de fila com ordenação por chave e fila de descarte.
- D7 - Decisão: Existe auditoria central, e com que retenção?; Recomendação e efeito no contrato: Se não existir, o Estoque mantém sozinho a trilha (RF-37) e A7 deixa de ser necessária.
- D8 - Decisão: Valores monetários; Recomendação e efeito no contrato: Não há preço no cadastro nem valor em notas, painéis e relatórios, e a curva ABC usa quantidade. Se a gestão quiser valores, preço entra como dado de outro módulo (D10), não como campo do insumo.
- D9 - Decisão: Prazos de SLA entre módulos e janela de manutenção (RNF-10).; Recomendação e efeito no contrato: Definir com a operação das clínicas.
- D10 - Decisão: Estoque orçamentário; Recomendação e efeito no contrato: A conversar com a equipe de gestão antes de qualquer desenho. Pode exigir uma nova dependência (módulo de orçamento ou financeiro). Não há API prevista nesta versão (N-13).
- D11 - Decisão: Empréstimo precisa de prazo e controle de retorno?; Recomendação e efeito no contrato: Hoje registra o destinatário e baixa o saldo. Um controle de retorno seria uma nova categoria de acompanhamento, distinta da devolução.
- D12 - Decisão: “Editar categorias por clínica” refere-se às categorias de insumo?; Recomendação e efeito no contrato: Assumido que sim (item-categories). As nove categorias de movimentação são fixas.
- D13 - Decisão: Quem notifica a empresa fornecedora nos recebimentos incorretos?; Recomendação e efeito no contrato: O Estoque só registra a data informada. Se o envio for pela plataforma, a notificação sairia do módulo de Notificações ou de Solicitações.

### Próximos passos

1. Validar as premissas das partes 1 e 4 com a equipe de arquitetura da plataforma (D1, D2, D6, D7, D10).
2. Transformar as tabelas das partes 4 e 5 em arquivos OpenAPI 3.1 e publicar o do Estoque em um portal de desenvolvedores interno.
3. Criar mocks dos módulos consumidos (A1 a A7) para permitir o desenvolvimento do Estoque em paralelo.
4. Escrever testes de contrato (consumer-driven) para os pontos de maior risco: baixa por execução (A3), nota de recebimento (A4) e alertas (A5).
