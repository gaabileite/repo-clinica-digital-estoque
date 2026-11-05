# Planejamento de sprints (básico, uso interno)

Interno da equipe. Fonte das histórias: [backlog.md](backlog.md). Os campos entre colchetes são para preencher no planejamento com o time; nada aqui tem data ou estimativa ainda.

## Premissas

- Duração sugerida: 4 dias por sprint.
- Uma história só entra na sprint se estiver **pronta para começar** (abaixo) e couber no tempo da sprint.

**Pronta para começar:** critérios de aceite escritos, dependências externas atrás de um adaptador simulado e decisões já registradas em `architecture.md` e na seção 9 do contrato.

**Pronta (definição de pronto):** critérios de aceite cobertos por testes, `pnpm lint`, `typecheck` e `test` passando, contrato e cliente sem divergência (`pnpm api:check`), migration versionada quando houver mudança de banco, acessibilidade verificada nas telas, revisão de código aprovada e demonstração feita.

## Divisão da equipe

Quatro pessoas, com papéis fixos ao longo das sprints. Com sprints de 1 semana, cada pessoa pega poucas histórias; o que não couber passa para a sprint seguinte. Troque os colchetes pelos nomes.

| Pessoa | Papel | Foco | Dono das pastas |
| --- | --- | --- | --- |
| **BE1** [nome] | Back-end | Núcleo do estoque: saldo, lotes, FEFO, movimentações, entradas, alertas e eventos | `apps/api/src/{stock,withdrawals,returns,movements,receipts,alerts,events,domain}` |
| **BE2** [nome] | Back-end | Plataforma e cadastros: acesso, contrato e adaptadores, catálogo, painel, relatórios, orçamento, auditoria | `apps/api/src/{access,items,categories,packages,settings,permissions,dashboard,reports,budget,audit,network,internal}` e `scripts/` |
| **FE1** [nome] | Front-end | Telas de operação: Estoque, Saídas, Devolução, Entradas e Painel | `apps/web/src/features/{stock,withdrawals,returns,receipts,dashboard}` |
| **FE2** [nome] | Front-end | Base do módulo e telas de gestão: Cadastros, Movimentações, Relatórios, Configurações, Notificações e Visão orçamentária | `apps/web/src/{app,lib,components,styles}` e `features/{registrations,movements,reports,settings,notifications,budget}` |

Combinados:

- **Contrato primeiro.** Para cada história, o BE publica a rota no OpenAPI (`pnpm api:generate`) antes de a tela ser ligada. Enquanto a rota não está pronta, o FE trabalha contra a resposta de exemplo do contrato.
- **Duplas na entrega.** Cada tela tem um par: BE1 com FE1 e BE2 com FE2. A dupla fecha o critério de aceite junto.
- **Revisão cruzada.** O merge request do BE é revisado pelo outro BE e o do FE pelo outro FE; o par confere só o contrato.
- **Quem cuida do quê.** Mudança de esquema do banco passa por BE1 e BE2; mudança nos tokens e componentes de interface passa por FE1 e FE2.
- Se uma pessoa ficar sem tarefa, ajuda a revisar e a testar a história que está mais atrasada, antes de puxar uma nova.

## Sprint 0: Fundação

**Meta:** o módulo roda isolado e dentro do shell, com banco, autenticação de desenvolvimento, contrato e CI funcionando de ponta a ponta.

| História | Tarefas |
| --- | --- |
| E0-H1 Repositório e esteira | Confirmar o repositório oficial e a visibilidade; proteger a branch principal; CI rodando em merge request |
| E0-H2 Remote no shell | Subir o módulo na 5175 e abrir `/supplies` no shell; testar a falha do módulo; conferir tema claro e escuro |
| E0-H3 Modelo de dados base | Revisar o esquema do banco com o time; aplicar a migration inicial; seed de demonstração |
| E0-H4 Autenticação e perfis | Validar o token JWT do IAM (claims `profile` e `clinic_ids`) e o cache de usuários; teste de acesso por perfil e por clínica |
| E0-H5 Contrato e mocks | Congelar o contrato 1.0 com os ajustes da 0.12; adaptadores simulados dos módulos externos |

**Entregáveis:** módulo abrindo no shell, esquema do banco aprovado e autenticação funcionando (token do IAM ou, até ele chegar, cabeçalhos de desenvolvimento).

**Riscos:** o shell hoje autentica por cookie de sessão e só conhece os papéis ADMIN e USER, então o token do IAM com os quatro perfis pode demorar a chegar ao módulo; até lá valem os cabeçalhos de desenvolvimento e o adaptador do IAM simulado.

### Divisão por pessoa

| Pessoa | Ações |
| --- | --- |
| **BE1** | E0-H3: revisar o esquema do banco e aplicar a migration inicial; seed de demonstração; subir o PostgreSQL local; conferir a CI de migrations. Esboçar o despachante de eventos (outbox) e os testes das regras do domínio. |
| **BE2** | E0-H4: validar o token JWT do IAM (claims `profile` e `clinic_ids`), manter a autenticação de desenvolvimento e o cache de usuários. E0-H5: congelar o contrato 1.0 com os ajustes da 0.12 e criar os adaptadores simulados de IAM, Organização, Atendimento, Solicitações, Notificações e Arquivos. E0-H1: proteger a branch principal e conferir a CI. |
| **FE1** | E0-H2: abrir o módulo em `/supplies` dentro do shell, testar a falha do módulo (aviso do shell) e o tema claro e escuro; garantir a execução isolada e a navegação pelos eventos do shell. |
| **FE2** | Base do módulo: cliente da API gerado com a credencial do usuário, provedor do TanStack Query, permissões do usuário filtrando a barra de navegação, componentes de estados (vazio, carregando e erro) e a verificação de acessibilidade na CI. |

## Sprint 1: Cadastros e consulta

**Meta:** o Administrador cadastra insumos e categorias e qualquer perfil consulta o estoque com lotes, validade e situação.

| História | Observação |
| --- | --- |
| E2-H1 Insumos | Código gerado pelo sistema, único por clínica |
| E2-H2 Categorias por clínica | Bloqueia inativar categoria com insumo ativo |
| E2-H4 Antecedência de validade | Alimenta a situação "a vencer" |
| E3-H1 Lista de estoque | Filtros, ordenação, contador e estados vazio, carregando e erro |
| E3-H2 Lotes do insumo | Cor e rótulo da validade em todas as telas |
| E1-H4 Isolamento entre clínicas | Teste cruzando ids de clínicas diferentes |
| E1-H5 Trilha de auditoria | Gravação; a tela de consulta está fora do escopo |

**Ficam para a Sprint 2:** E1-H1 (clínicas) e E1-H2 (usuários, vindos do IAM), que dependem da autenticação pronta; E1-H3 (permissões editáveis); E2-H3 (pacotes); E2-H5 (parâmetros).

**Entregáveis:** telas Cadastros (insumos e categorias) e Estoque funcionando.

**Riscos:** volume de histórias; se estourar, cortar E2-H4 e E1-H5 para a Sprint 2.

### Divisão por pessoa

| Pessoa | Ações |
| --- | --- |
| **BE1** | E3-H1 e E3-H2: rotas de saldo e de lotes (situação, cobertura, validade mais próxima, ordem FEFO) usando as regras do domínio; E2-H4: antecedência de validade por insumo. |
| **BE2** | E2-H1 e E2-H2: insumos (código `INS-0001` gerado, `If-Match`) e categorias por clínica; E1-H4: isolamento entre clínicas, com teste que cruza ids; E1-H5: gravação da trilha de auditoria. |
| **FE1** | E3-H1 e E3-H2: tela Estoque (busca, filtros, ordenação, contador, estados vazio e erro) e o modal de lotes, com cor e rótulo da validade; botão "Como ler o nível crítico". |
| **FE2** | E2-H1 e E2-H2: tela Cadastros (insumos e categorias) com validação por campo e confirmação ao inativar. |


## Sprint 2: Saídas e movimentações

**Meta:** registrar retirada com FEFO, devolução, descarte, estorno e consultar o livro de movimentações.

Histórias: E4-H1 a E4-H8 e, se houver capacidade, E2-H3 e E2-H5. É o núcleo do módulo: priorizar E4-H1, E4-H2, E4-H6 e E4-H7. Primeira tarefa: trocar `number` por `Decimal` no domínio. O empréstimo só registra o destinatário (decisão D11).

### Divisão por pessoa

| Pessoa | Ações |
| --- | --- |
| **BE1** | Trocar `number` por `Decimal` no domínio (primeira tarefa). E4-H1: retirada com FEFO, travamento dos lotes e `Idempotency-Key`; E4-H2: avisos de lote diferente e de retirada acima da média; E4-H6: livro de movimentações; E4-H7: estorno. |
| **BE2** | E4-H3: pacote de insumos e proposta pendente; E4-H4: devolução; E4-H5: perdas e descarte de lotes vencidos; E4-H8: ajuste de inventário. Se houver capacidade: E2-H3 (pacotes), E2-H5 (parâmetros), E1-H3 (permissões); E1-H1 e E1-H2 (clínicas e usuários por evento) ficam para a Sprint 3 se faltar tempo. |
| **FE1** | Tela Saídas (retirada com lote sugerido, avisos e aba de pacote), tela Devolução e o aviso com "Desfazer" depois do registro. |
| **FE2** | Tela Movimentações (filtros, paginação, estorno e ajuste de inventário); Cadastros de pacotes; Configurações (parâmetros e permissões por perfil). |

## Sprint 3: Entradas e recebimentos

**Meta:** registrar entradas por origem com nota de recebimento, estornar a nota e tratar os recebimentos incorretos. Histórias: E5-H1 a E5-H6.

### Divisão por pessoa

| Pessoa | Ações |
| --- | --- |
| **BE1** | E5-H1: entrada por origem e emissão da nota; E5-H4: estorno da nota (recusa se algum lote foi movimentado); E5-H2: tempo de reposição medido; eventos `stock.receipt.*`. E1-H1 e E1-H2 se tiverem ficado da Sprint 2 (consumidores de `org.clinic.*` e `iam.user.*`). |
| **BE2** | E5-H5: recebimentos incorretos (prazo de 45 dias, troca, incorporação e descarte); E5-H6: requisições em aberto pelo adaptador de Solicitações; E5-H3: PDF da nota pelo adaptador de Arquivos. |
| **FE1** | Tela Entradas, aba "Nova entrada": origem, anexos, linhas com validação por linha e erro da linha na tabela. |
| **FE2** | Abas "Notas de recebimento" (lista, detalhe e estorno) e "Recebimentos incorretos" (prazo restante e decisão depois dos 45 dias). |

## Sprint 4: Alertas e Painel

**Meta:** o módulo avisa sobre nível crítico, validade e uso fora do padrão, e o Painel mostra a situação da clínica. Histórias: E6-H1 a E6-H7 e E7-H1.

### Divisão por pessoa

| Pessoa | Ações |
| --- | --- |
| **BE1** | E6-H1: cálculo do nível crítico sobre os dados reais; E6-H2 e E6-H3: alertas de nível crítico e de validade; E6-H4: alertas de uso e a varredura diária (`internal/jobs/daily-scan`) com a rotina local. |
| **BE2** | E6-H5 a E6-H7: adaptador de Notificações (registro das categorias, envio com chaves de agrupamento e de repetição); E7-H1: rotas do Painel (indicadores, listas e consumo semanal); E1-H4 estendido à visão da rede do Superuser. |
| **FE1** | E7-H1: tela Painel (indicadores, itens críticos, validades próximas, gráfico semanal e atalhos que abrem o Estoque já filtrado). |
| **FE2** | E6-H5 e E6-H6: sino com contador e tela de Notificações lendo a caixa da plataforma; cor e rótulo da validade iguais em todas as telas. |

## Sprint 5: Relatórios e visão orçamentária

**Meta:** relatórios com exportação e a visão monetária para o Controlador Orçamentário. Histórias: E7-H2 a E7-H4 e E8-H1 a E8-H4. A visão orçamentária segue as decisões D8 e D10; se faltar tempo, é o primeiro item a sair do piloto.

### Divisão por pessoa

| Pessoa | Ações |
| --- | --- |
| **BE1** | E7-H2 a E7-H4: relatórios de consumo e de perdas, curva ABC e exportação assíncrona em PDF e Excel. |
| **BE2** | E8-H1 a E8-H4: perfil Controlador, custo unitário com auditoria, rotas `budget/*` e chave do Superuser; teste automatizado de que nenhuma resposta traz valores monetários a quem não tem o escopo (RNF-05). |
| **FE1** | Tela Relatórios (filtros, agrupamento) e o fluxo de exportação assíncrona (pedido, progresso e download). |
| **FE2** | Tela Visão orçamentária (valor em estoque, perdas e consumo em reais), edição do custo unitário, chave do Superuser e exportação das telas monetárias. |

## Sprint 6: Fechamento e piloto

**Meta:** módulo estável, medido e testado com o cliente. Histórias: E9-H1 a E9-H4, correções e teste com o cliente.

### Divisão por pessoa

| Pessoa | Ações |
| --- | --- |
| **BE1** | E9-H2: desempenho (índices e consultas lentas; meta de 2 segundos); E9-H1: retenção de 5 anos e backup com restauração testada; endurecer o despachante de eventos e a fila de descarte. |
| **BE2** | E9-H4: importação dos insumos e saldos da clínica piloto; testes de contrato para baixa por execução, nota de recebimento e alertas; revisão de segurança (escopos, isolamento e erros). |
| **FE1** | E9-H3: acessibilidade (teclado e leitor de tela) e uso no celular nas telas de operação; correções do teste com o cliente. |
| **FE2** | E9-H3 nas telas de gestão e no tema escuro; material de treinamento do Almoxarife; polimento dos estados e das mensagens. |
