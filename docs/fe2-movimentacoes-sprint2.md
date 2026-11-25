# FE2: Movimentações e ajuste de inventário

Primeiro bloco de Justino no cronograma de entrega até 26/11.

## Comportamento

- Livro por clínica, com autoria, data e hora em Recife, insumo, lote/validade históricos, quantidade com sinal, categoria, motivo, destinatário, origem e vínculos de estorno.
- Filtros no servidor por código do insumo, categoria, ID do usuário, lote e datas. Período invertido é recusado antes da consulta.
- Paginação por cursor, contador, estados de carregamento/vazio/erro e repetição da próxima página sem remover os registros já exibidos.
- Trocar clínica reinicia filtros e formulários, sem reaproveitar linhas da anterior.
- Ajuste disponível apenas com `stock:adjust`: seleção de insumo ativo e lote, contagem não negativa (zero permitido), até três casas decimais e justificativa obrigatória.
- Cada envio de ajuste usa `Idempotency-Key`. Repetir o mesmo corpo após erro conserva a chave. Sucesso atualiza as consultas do livro, dos saldos e dos lotes.
- Tema usa os tokens existentes; diálogo com Escape e retorno do foco; tabela com rolagem horizontal por teclado em telas estreitas.

## Dependências e limites

- Base: `main` em `a556f7f63863d104dd790cbb86a385e8fdf8aa71`.
- Ajuste E-26: PR #16, já integrado. O corpo usa `countedQuantity` e `justification`.
- Consulta E-39: segue o DTO de resposta e os filtros publicados no PR #17, commit `e0e76de82a0f4b0dd987aa0bec15868a1c2f199d`. Até ele entrar, a API da main responde 501 e a tela informa a indisponibilidade. O formulário de ajuste continua acessível a quem tem permissão.
- O cliente gerado não foi alterado. A consulta usa sua função de URL, o mutator autenticado e um tipo de resposta local até a próxima geração do cliente.
- A API do PR #17 não oferece busca geral por nome do insumo, nome do usuário ou motivo. Esta entrega usa os filtros efetivamente implementados, sem filtrar apenas a página carregada e produzir um total incorreto.
- Ação de estornar (E4-H7) fica para o próximo bloco, quando o backend publicar o corpo e as regras de autorização da E-25. Esta entrega apenas mostra os vínculos de estorno retornados pelo livro.
- Notas de recebimento, Notificações e Visão orçamentária são os próximos blocos do cronograma, não fazem parte deste patch.

## Validação nesta preparação

- `pnpm lint`, `pnpm typecheck` e `pnpm api:check`: passaram.
- `pnpm test`: 202 testes passaram (177 API e 25 web).
- `pnpm --dir apps/web build`: passou.
- 12 cenários Playwright adicionados. A execução foi bloqueada antes de abrir a página por restrição do Chromium no ambiente de preparação. Não foram considerados aprovados.
- Ainda falta executar o Playwright em ambiente com navegador disponível e validar com API/PostgreSQL reais após integrar o PR #17.

## Conferir no Windows antes de publicar

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm api:check
pnpm --dir apps/web build
pnpm --dir apps/web exec playwright test
```

Com o banco e a API locais funcionando e o PR #17 integrado, acessar `/movements` com a sessão de desenvolvimento: conferir filtros, próxima página, troca de clínica e ajuste de uma contagem. O histórico deve refletir a diferença do ajuste. Confirmar no PostgreSQL o saldo e a movimentação, e repetir a mesma contagem para conferir que não gera outra movimentação.
