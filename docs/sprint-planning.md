# Planejamento de sprints (básico, uso interno)

Interno da equipe. Fonte das histórias: [backlog.md](backlog.md). Os campos entre colchetes são para preencher no planejamento com o time; nada aqui tem data ou estimativa ainda.

## Premissas

- Duração sugerida: 1 semana por sprint.
- Uma história só entra na sprint se estiver **pronta para começar** (abaixo) e couber na capacidade.

**Pronta para começar:** critérios de aceite escritos, dependências externas resolvidas ou com mock combinado, pontos em aberto que a afetam respondidos ou registrados como suposição.

**Pronta (definição de pronto):** critérios de aceite cobertos por testes, `pnpm lint`, `typecheck` e `test` passando, contrato e cliente sem divergência (`pnpm api:check`), migration versionada quando houver mudança de banco, acessibilidade verificada nas telas, revisão de código aprovada e demonstração feita.

## Sprint 0: Fundação

**Meta:** o módulo roda isolado e dentro do shell, com banco, autenticação de desenvolvimento, contrato e CI funcionando de ponta a ponta.

| História | Tarefas |
| --- | --- |
| E0-H1 Repositório e esteira | Confirmar o repositório oficial e a visibilidade; proteger a branch principal; CI rodando em merge request |
| E0-H2 Remote no shell | Subir o módulo na 5175 e abrir `/supplies` no shell; testar a falha do módulo; conferir tema claro e escuro |
| E0-H3 Modelo de dados base | Revisar o esquema do banco com o time (ADR-001); aplicar a migration inicial; seed de demonstração |
| E0-H4 Autenticação e perfis | Decidir o mecanismo (ADR-002); mapear os 4 perfis no IAM; teste de acesso por perfil e por clínica |
| E0-H5 Contrato e mocks | Congelar o contrato 1.0 com os ajustes da v2.0; mocks dos módulos externos |

**Entregáveis:** módulo abrindo no shell, esquema do banco aprovado.

**Riscos:** mapeamento dos perfis no IAM depende de outra equipe; contrato e shell divergem no prefixo da API e no tipo de credencial.

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

**Ficam para a Sprint 2 ou quando a dependência destravar:** E1-H1 (clínicas) e E1-H2 (usuários), porque dependem de Organização e IAM; E1-H3 (permissões editáveis); E2-H3 (pacotes); E2-H5 (parâmetros).

**Entregáveis:** telas Cadastros (insumos e categorias) e Estoque funcionando.

**Riscos:** volume de histórias; se estourar, cortar E2-H4 e E1-H5 para a Sprint 2.

## Sprint 2: Saídas e movimentações

**Meta:** registrar retirada com FEFO, devolução, descarte, estorno e consultar o livro de movimentações.

Histórias: E4-H1 a E4-H8 e, se houver capacidade, E2-H3 e E2-H5. É o núcleo do módulo: priorizar E4-H1, E4-H2, E4-H6 e E4-H7. Atenção ao ponto em aberto 3 (empréstimo com prazo e retorno).

## Sprints 3 a 6 (visão geral, detalhar no planejamento de cada uma)

| Sprint | Meta | Histórias |
| --- | --- | --- |
| 3 | Entradas e recebimentos | E5-H1 a E5-H6 |
| 4 | Alertas e Painel | E6-H1 a E6-H7, E7-H1 |
| 5 | Relatórios e visão orçamentária | E7-H2 a E7-H4, E8-H1 a E8-H4 |
| 6 | Fechamento e piloto | E9-H1 a E9-H4, correções, teste com o cliente |

A visão orçamentária (E8) depende de respostas do cliente aos pontos em aberto 1 e 2. Se elas demorarem, mova E8 para depois do piloto e antecipe o fechamento.
