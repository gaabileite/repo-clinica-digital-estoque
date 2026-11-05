# ADR-002: Autenticação da API e prefixo das rotas

## Status
Proposto (depende da coordenação da plataforma)

## Contexto
O contrato v0.11 do módulo assume OAuth 2.0 com token JWT no cabeçalho `Authorization` e claims `profile`, `clinic_ids` e `scope`, com base `/stock/v1`. O shell, hoje, autentica por sessão local em cookie `HttpOnly` (BFF com Keycloak), só conhece os papéis ADMIN e USER, e encaminha `/api/v1/supplies` para o módulo. Além disso, o contrato mistura português e inglês nos campos (ex.: `nome`, `controlaLoteValidade` ao lado de `donorLetterFileId`).

## Decisão (a tomar)
1. Como o módulo recebe a identidade: validar o JWT do IAM, ou receber a sessão do shell, ou um cabeçalho confiável do BFF.
2. Como os quatro perfis do módulo (superuser, admin, warehouse, budget-controller) saem do IAM, já que o shell só tem dois papéis.
3. Prefixo: manter `/api/v1` (o shell já encaminha `/api/v1/supplies` para o módulo) e registrar a diferença no contrato v0.12, ou adotar `/stock/v1`.
4. Padronizar o idioma dos campos do contrato na v0.12.

## Situação do esqueleto
`AuthGuard` só aceita autenticação de desenvolvimento por cabeçalhos (`x-dev-user`, `x-dev-profile`, `x-dev-clinics`), ligada por `DEV_AUTH_ENABLED=true` e proibida com `NODE_ENV=production` (a API se recusa a subir). A decisão deve substituir esse ponto.

## Consequências
Enquanto não decidido, nenhuma rota é segura para uso real. É o primeiro bloqueio da Sprint 0.
