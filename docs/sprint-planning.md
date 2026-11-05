# Planejamento de sprints (básico, uso interno)

Interno da equipe. Fonte das histórias: [backlog.md](backlog.md). Os campos entre colchetes são para preencher no planejamento com o time; nada aqui tem data ou estimativa ainda.

## Premissas

- Duração sugerida: 2 semanas por sprint.
- Cada sprint termina com uma demonstração e uma retrospectiva curta.
- Uma história só entra na sprint se estiver **pronta para começar** (abaixo) e couber na capacidade.
- Estimativas: pontos por história ou camisetas (P, M, G), definidas pelo time no planejamento. Sugestão: estimar primeiro as histórias da Sprint 0 e da Sprint 1.

**Pronta para começar:** critérios de aceite escritos, dependências externas atrás de um adaptador simulado e decisões de produto já registradas em `architecture.md`.

**Pronta (definição de pronto):** critérios de aceite cobertos por testes, `pnpm lint`, `typecheck` e `test` passando, contrato e cliente sem divergência (`pnpm api:check`), migration versionada quando houver mudança de banco, acessibilidade verificada nas telas, revisão de código aprovada e demonstração feita.

## Capacidade (preencher a cada sprint)

| Pessoa | Papel | Dias disponíveis | Observações |
| --- | --- | --- | --- |
| [nome] | [dev API / dev web / testes] | [x de 10] | [férias, aulas, provas] |

Capacidade total: [x] dias de trabalho. Reservar cerca de 20% para revisão, correções e imprevistos.

## Sprint 0: Fundação

**Meta:** o módulo roda isolado e dentro do shell, com banco, autenticação de desenvolvimento, contrato e CI funcionando de ponta a ponta.

| História | Tarefas |
| --- | --- |
| E0-H1 Repositório e esteira | Confirmar o repositório oficial e a visibilidade; proteger a branch principal; CI rodando em merge request |
| E0-H2 Remote no shell | Subir o módulo na 5175 e abrir `/supplies` no shell; testar a falha do módulo; conferir tema claro e escuro |
| E0-H3 Modelo de dados base | Revisar o esquema do banco com o time; aplicar a migration inicial; seed de demonstração |
| E0-H4 Autenticação e perfis | Implementar a autenticação pelo `/auth/me` do shell e a tabela `user_cache`; teste de acesso por perfil e por clínica |
| E0-H5 Contrato e mocks | Congelar o contrato 1.0 com os ajustes da v2.0; mocks dos módulos externos |

**Entregáveis:** pipeline verde, módulo abrindo no shell, esquema do banco aprovado e autenticação funcionando com o shell.

**Já adiantado no esqueleto:** estrutura de pastas, 69 rotas declaradas, regras puras testadas, guards de perfil e de clínica, migration inicial, CI.

**Riscos:** o `/auth/me` do shell só conhece os papéis ADMIN e USER, então os perfis do módulo ficam todos em `user_cache`; o contrato v0.11 diverge do shell no prefixo e na credencial (decisão em `architecture.md`, a v0.12 registra).

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

**Ficam para a Sprint 2:** E1-H1 (clínicas) e E1-H2 (usuários), que dependem da autenticação pronta; E1-H3 (permissões editáveis); E2-H3 (pacotes); E2-H5 (parâmetros).

**Entregáveis:** telas Cadastros (insumos e categorias) e Estoque funcionando com dados reais, demonstração ao cliente com o protótipo como referência.

**Riscos:** volume de histórias; se estourar, cortar E2-H4 e E1-H5 para a Sprint 2.

## Sprint 2: Saídas e movimentações

**Meta:** registrar retirada com FEFO, devolução, descarte, estorno e consultar o livro de movimentações.

Histórias: E4-H1 a E4-H8 e, se houver capacidade, E2-H3 e E2-H5. É o núcleo do módulo: priorizar E4-H1, E4-H2, E4-H6 e E4-H7. Primeira tarefa: trocar `number` por `Decimal` no domínio. O empréstimo só registra o destinatário (decisão 3).

## Sprints 3 a 6 (visão geral, detalhar no planejamento de cada uma)

| Sprint | Meta | Histórias |
| --- | --- | --- |
| 3 | Entradas e recebimentos | E5-H1 a E5-H6 |
| 4 | Alertas e Painel | E6-H1 a E6-H7, E7-H1 |
| 5 | Relatórios e visão orçamentária | E7-H2 a E7-H4, E8-H1 a E8-H4 |
| 6 | Fechamento e piloto | E9-H1 a E9-H4, correções, teste com o cliente |

A visão orçamentária (E8) segue as decisões 1 e 2 de `architecture.md`. Se faltar tempo, ela é o primeiro item a sair do piloto.

## Rituais

| Cerimônia | Quando | Duração sugerida |
| --- | --- | --- |
| Planejamento | Primeiro dia da sprint | até 2 horas |
| Reunião diária | Todo dia útil | 15 minutos |
| Refinamento do backlog | Meio da sprint | 1 hora |
| Revisão e demonstração | Último dia | 1 hora |
| Retrospectiva | Logo após a revisão | 45 minutos |

## Roteiro para o planejamento de cada sprint

1. Revisar a meta da sprint e o resultado da anterior.
2. Conferir a capacidade da tabela acima.
3. Escolher as histórias pela ordem do backlog, confirmando que estão prontas para começar.
4. Quebrar cada história em tarefas e estimar.
5. Registrar riscos, dependências e quem responde por cada um.
6. Combinar o que será mostrado na demonstração.

## Modelo para copiar

```markdown
## Sprint N: [nome]

Período: [dd/mm a dd/mm]. Capacidade: [x dias].
Meta: [uma frase].

| História | Estimativa | Responsável | Tarefas |
| --- | --- | --- | --- |

Riscos e dependências: [lista com responsável].
Demonstração: [o que será mostrado e a quem].
Resultado (preencher no fim): [entregue, adiado, aprendizados].
```
