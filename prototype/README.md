# Protótipo do módulo Estoque e insumos (referência de interface)

> Este protótipo é a referência visual e de comportamento. O módulo de verdade é construído em `apps/web` e `apps/api`; não evolua este código.


Protótipo semifuncional e clicável do módulo, empacotado como o micro frontend (remote) que o shell já espera em `suppliesMfe/App`. Ele renderiza **só o conteúdo do módulo**: menu lateral, cabeçalho, tema, usuário e rodapé continuam sendo do shell.

Os dados são fictícios e ficam no `localStorage` do navegador. Não há chamada de API.

## Rodar isolado

O ADR-007 exige que cada MFE rode sozinho.

```bash
npm install        # ou pnpm install
npm run dev        # http://localhost:5175 (porta reservada ao Estoque em docs/module-catalog.md)
```

A execução isolada usa um quadro mínimo (`src/main.tsx`) com os tokens do shell copiados em `src/standalone.css` e um botão de tema.

## Encaixar no shell

O shell não precisa de nenhuma alteração. Ele já tem:

- o remote `suppliesMfe` apontando para `http://localhost:5175/remoteEntry.js` (`apps/web/vite.config.ts`);
- a rota `/supplies/*` com o `SuppliesMfe` (`apps/web/src/components/mfe/supplies-mfe.tsx`);
- a declaração de tipo de `suppliesMfe/App` (`apps/web/src/module-federation.d.ts`);
- o item "Estoque e insumos" no menu lateral.

Basta subir este pacote na porta 5175 (`npm run dev`) e o shell na 5173.

| Ponto | Contrato |
| --- | --- |
| Nome do remote | `suppliesMfe` |
| Módulo exposto | `./App`, com `export` nomeado `App` e sem props obrigatórias |
| React | `react` e `react-dom` como singleton, iguais aos do shell |
| Cores e tema | usa os tokens semânticos do shell (`--surface`, `--heading`, `--brand-*`, `--status-*`) e acompanha a classe `.dark` de `<html>`. Não redefine nenhum token. |
| CSS | tudo sob `.est-root`; nada vaza para o shell |
| Rota | `/supplies` (Painel) e `/supplies/<tela>` |

### Navegação e URL

O módulo usa o mesmo protocolo que o `AuthLayout` do shell já implementa:

- ao trocar de tela, o módulo dispara `mfe-navigated` com `{ pathname, search }` e o shell atualiza a URL;
- o módulo escuta `shell-navigated`. Um clique do usuário no menu do shell ou um link direto leva à tela certa.

Telas: `painel` (é a própria `/supplies`), `estoque`, `saida`, `dev`, `entrada`, `mov`, `rel`, `cad`, `conf` e `notif` (sino).

As telas aparecem numa barra no topo do módulo, filtradas pelo perfil. Como a lista muda por perfil, ela não foi colocada como submenu fixo no menu lateral do shell.

### Simulação de sessão

O shell ainda não entrega o perfil do módulo (Superuser, Administrador, Almoxarife, Controlador Orçamentário). Por isso o protótipo mostra uma faixa tracejada "Simulação" com a troca de perfil, a visão da rede (Superuser), a chave de visão orçamentária (Superuser), a **conexão simulada** (Normal, Lenta ou Com falha) e o link para reiniciar os dados. No celular a faixa começa recolhida. Na integração real essa faixa sai e o perfil vem da sessão, conforme o contrato de APIs.

## UX e UI

Os padrões abaixo seguem os componentes do shell (`state-feedback`, `form-field`, `button`, `page-header`):

- **Estados de tela:** carregando, vazio (com ação contextual, como "Limpar filtros") e erro (com "Tentar novamente"). Para revisar com o cliente, troque a conexão simulada para Lenta ou Com falha.
- **Botões ocupados:** enviar formulário e exportar mostram o indicador de progresso e bloqueiam o clique duplo.
- **Formulários:** campos obrigatórios marcados, validação sem balão nativo, erro no próprio campo (e na linha da tabela, nas entradas), resumo no topo com a contagem de pendências e foco no primeiro campo com problema. Cada erro é lido por leitor de tela (`aria-invalid` e `aria-describedby`).
- **Fluxo em sequência:** depois de registrar uma saída ou devolução, o foco volta ao campo de código para o próximo lançamento.
- **Avisos:** têm botão de fechar, pausam ao passar o mouse ou focar e podem trazer uma ação. Registrar uma saída oferece "Desfazer", que cria o estorno e mantém os dois lançamentos no histórico.
- **Nível crítico:** o selo é focável e a dica aparece no mouse, no teclado e no toque. O botão "Como ler o nível crítico" abre a explicação da escala de 0 a 10 e do cálculo.
- **Orientação:** contador "Exibindo N de M insumos" no Estoque, linhas inativas ou estornadas sem perda de contraste e menu do módulo que centraliza o item ativo e indica quando há mais itens ao rolar.
- **Celular:** tabelas largas mostram sombra na borda quando há mais conteúdo para rolar.

## O que é protótipo e o que falta

- O código é JavaScript sem framework (`src/engine/engine.js`: HTML por strings, eventos por `data-act`). O React só monta e desmonta o motor. Para produção, o módulo deve ser reescrito em React/TypeScript no repositório do módulo, com TanStack Query e o cliente gerado do contrato (`../docs/api-contract.md`).
- As exportações em PDF e Excel carregam jsPDF e SheetJS de um CDN só no primeiro clique em exportar. Em produção, usar bibliotecas empacotadas ou gerar o arquivo no servidor.
- Perfis, permissões, auditoria e notificações são simulados no navegador.
- O logotipo não é usado: as imagens do manual de identidade não podem ser extraídas do PDF (regra do shell, em `apps/web/src/components/brand/README.md`).
- Acessibilidade: zero violações no axe-core 4.9.1 em 70 estados (4 perfis, tema claro e escuro, todas as telas, mais os estados de carregamento, erro e vazio, a janela de explicação e os formulários com erro). Falta teste com leitor de tela real.

## Verificação feita

Teste com um host mínimo que reproduz o contrato do shell (mesmo plugin de Module Federation, mesmo carregamento `lazy`, mesmos eventos de navegação e a mesma estrutura de tokens). Não foi testado dentro do shell completo, porque ele exige login (Keycloak e API).

## Arquivos

```text
prototype/
├── package.json            dependências e scripts
├── vite.config.ts          Module Federation: name suppliesMfe, expõe ./App, porta 5175
├── index.html              entrada da execução isolada
└── src/
    ├── App.tsx             componente exposto ao shell
    ├── main.tsx            quadro mínimo da execução isolada
    ├── standalone.css      tokens do shell (só na execução isolada)
    └── engine/
        ├── engine.js       motor do protótipo (telas, regras, dados fictícios)
        ├── engine.d.ts     tipos de mount()
        └── estoque.css     estilos do módulo, sob .est-root
```

## Origem

Este código foi derivado do protótipo autônomo em HTML único que foi validado com o cliente, retirando o que o shell já fornece (menu lateral, cabeçalho, login, tema e rodapé). A partir daqui, **esta pasta é a fonte**: mudanças feitas no HTML autônomo não chegam aqui sozinhas.
