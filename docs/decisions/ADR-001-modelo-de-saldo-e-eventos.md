# ADR-001: Modelo de saldo, concorrência no FEFO e publicação de eventos

## Status
Proposto

## Contexto
O saldo de cada insumo vive em lotes. As saídas seguem o FEFO (RN-04) e podem chegar ao mesmo tempo de várias pessoas; o livro de movimentações só recebe inclusões e o estorno é um novo lançamento (RN-07). Os eventos do contrato (P-01 a P-06) precisam sair sem perder mensagem. O esquema atual (`apps/api/prisma/schema.prisma`) guarda a quantidade em `lots.quantity` e cada movimentação com lote e validade (RNF-14).

## Decisão (proposta)
- O saldo do lote (`lots.quantity`) é um dado derivado, atualizado na mesma transação que grava a movimentação. O livro é a fonte da verdade e permite reconstruir o saldo.
- Saídas travam as linhas dos lotes envolvidos (`SELECT ... FOR UPDATE`, ordenadas por id para evitar deadlock) antes de alocar pelo FEFO.
- Eventos são gravados na tabela `outbox_events` na mesma transação e despachados por um processo separado, com entrega "pelo menos uma vez".
- Quantidades em `Decimal(14,3)` no banco e em string decimal na API (contrato); o domínio hoje usa `number` e deve migrar para uma biblioteca decimal antes da primeira saída real.

## Consequências
Reconstrução e auditoria ficam simples; o custo é a disciplina de nunca alterar saldo fora da transação do livro. O travamento serializa saídas do mesmo lote, o que é aceitável para o volume de uma clínica.

## Alternativas consideradas
- Saldo calculado só pela soma do livro: mais puro, mas lento nas consultas de estoque (RNF-08).
- Publicar o evento direto após o commit: pode perder evento se o processo cair entre os dois passos.
