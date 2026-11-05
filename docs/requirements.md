# Documento de Especificação de Requisitos - Módulo de Estoque

Projeto de extensão entre o sistema NUTES e o Centro de Informática da UFPE (CIn).

Autores: Eliseu Cordeiro, Gabriel Justino, Gabriela Leite, Iasmym Mendes, Lucas Medrado, Luis Eduardo.

Versão 2.0, outubro de 2026. Revisão após a reunião de alinhamento de 22/10/2026 e a validação do protótipo. Substitui a versão 1.0.

Conteúdo: 45 requisitos funcionais, 15 regras de negócio, 14 requisitos não funcionais, escopo adiado e pontos em aberto.

## 1. Introdução

Este documento descreve os requisitos para o desenvolvimento do módulo de software de estoque no projeto de extensão entre o sistema NUTES e o Centro de Informática da UFPE (CIn). A versão 2.0 substitui a 1.0 e reflete o que foi decidido na reunião de 22/10/2026 e o que foi validado no protótipo navegável.

### Histórico de revisões

- 1.0 (outubro de 2026): documento original, com 42 requisitos funcionais (IDs repetidos), 11 requisitos não funcionais e 6 pontos em aberto.
- 2.0 (outubro de 2026): requisitos reorganizados e renumerados, inconsistências da v1 corrigidas, decisões da reunião de 22/10/2026 e mudanças pedidas na validação do protótipo incorporadas (perfil Almoxarife, nível crítico de 0 a 10, devolução, recebimentos incorretos, alertas de uso, estoque orçamentário e outras).

### 1.1. Visão geral deste documento

- Seção 2, Requisitos funcionais: com prioridade e origem em relação à versão 1.0.
- Seção 3, Regras de negócio: cálculos e regras que os requisitos citam.
- Seção 4, Requisitos não funcionais.
- Seção 5, Fora do escopo desta fase.
- Seção 6, Pontos em aberto.
- Anexo A, Perfis, permissões e telas.
- Anexo B, Rastreabilidade com a versão 1.0.

### 1.2. Convenções, termos e abreviações

- Insumo: Item consumível controlado pelo estoque. Cada insumo tem um código gerado pelo sistema (por exemplo, INS-0001).
- Lote: Conjunto de unidades de um insumo recebidas juntas, com a mesma validade.
- Saída (baixa): Retirada de insumo do estoque, por consumo, perda por validade, descarte por avaria, empréstimo ou doação.
- Pacote de insumos: Lista pré-definida de insumos e quantidades, usada para dar baixa de uma vez. Substitui o termo "procedimento padrão" da versão 1.0.
- Saldo utilizável: Saldo do insumo sem os lotes vencidos.
- Cobertura: Quantos dias o saldo utilizável dura, no ritmo de consumo médio (RN-02).
- Nível crítico: Nota de 0 a 10 (10 = muito crítico) que indica o risco de o insumo faltar antes da reposição (RN-01). É calculada, não digitada.
- Tempo de reposição: Estimativa, em dias, informada no cadastro do insumo. É usada até que existam entradas com data de pedido.
- Lead time: Tempo médio, medido, entre o pedido de um insumo e a sua entrada efetiva no estoque (RN-03).
- FEFO: First expired, first out: o lote com validade mais próxima sai primeiro.
- Categoria de movimentação: Uma das nove classes do log: consumo, perda por validade, descarte por avaria, empréstimo, doação, entrada, estorno, ajuste de inventário e devolução.
- Recebimento incorreto: Produto entregue errado (cor, tamanho ou modelo diferente do pedido) que a empresa ainda não trocou.
- Superuser: Perfil que enxerga e coordena todas as clínicas da rede.
- Almoxarife: Perfil que opera o estoque de uma clínica. Substitui o Técnico.
- Controlador Orçamentário: Perfil que acompanha o aspecto monetário do estoque de uma clínica.
- Visão orçamentária: Conjunto de telas somente monetárias, usado pelo Controlador e, por meio de uma chave, pelo Superuser.
- Log: Histórico de ações. O log de movimentações registra as movimentações de estoque; a trilha de auditoria registra as alterações de dados.

### 1.3. Prioridades dos requisitos

- Essencial: requisito sem o qual o sistema não entra em funcionamento. Deve ser implementado desde as primeiras implantações.
- Importante: requisito sem o qual o sistema entra em funcionamento, mas de forma não satisfatória. Deve ser implantado o mais rápido possível.
- Desejável: requisito que não compromete as funcionalidades básicas. Pode ser implantado por último.

Cada requisito funcional mostra a origem em relação à versão 1.0: Mantido, Alterado ou Novo. O Anexo B traz o caminho inverso.

### 1.4. Perfis do sistema

- Superuser (toda a rede): Cadastra clínicas e usuários, configura permissões e parâmetros, vê os indicadores consolidados da rede e recebe todos os alertas. Pode ligar a visão orçamentária.
- Administrador (uma clínica): Cadastra insumos, categorias, pacotes e usuários da sua unidade; opera o estoque; trata os recebimentos incorretos; recebe os alertas de uso; consulta relatórios.
- Almoxarife (uma clínica): Opera o estoque: registra saídas, devoluções, entradas, recebimentos incorretos e ajustes de inventário, e estorna movimentações. Não altera cadastros.
- Controlador Orçamentário (uma clínica): Acompanha somente a parte monetária do estoque da sua clínica e mantém o custo unitário dos insumos. Há um por clínica. Não opera o estoque.

O perfil Técnico foi substituído pelo Almoxarife e o perfil Solicitante foi retirado: os pedidos seguem pelo sistema de solicitações (seção 5).

### 1.5. O que mudou em relação à versão 1.0

- Perfis: De Superuser, Administrador, Técnico e Solicitante para Superuser, Administrador, Almoxarife e Controlador Orçamentário.
- Escopo: Transferências entre clínicas saem desta fase. Fornecedores saem do cadastro.
- Insumos: Cadastro simplificado, com código gerado; categorias editáveis por clínica; classificação saiu.
- Nível crítico: Nota calculada de 0 a 10 (10 = muito crítico), não mais digitada.
- Saídas: Retirada pelo código com lote sugerido; nove categorias de movimentação; pacote de insumos no lugar de procedimento padrão; devolução como item próprio.
- Entradas: Entrada por origem, com carta do doador e comprovante; estorno de nota só se nada foi movimentado; recebimentos incorretos com prazo de 45 dias.
- Alertas: Novos: lote fora da validade mais próxima, retirada acima da média e consumo abaixo do aprendido. Notificações só pelo sino.
- Painel e relatórios: Itens em vez de lotes; validade em cores padronizadas; exportação em PDF e Excel.
- Estoque orçamentário: Perfil Controlador Orçamentário, custo unitário por insumo, visão orçamentária somente monetária e chave para o Superuser.

## 2. Requisitos funcionais

São 45 requisitos, de RF-01 a RF-45. Os IDs foram renumerados nesta versão; o Anexo B faz a correspondência com a versão 1.0.

### 2.1. Cadastro e configuração

#### [RF-01] Cadastro de clínicas

Prioridade: Essencial. Origem: Mantido (v1: RF-01).

O sistema deve permitir o cadastro de clínicas da rede, com identificação, endereço e responsável. Apenas o Superuser cadastra clínicas.

#### [RF-02] Cadastro de usuários

Prioridade: Essencial. Origem: Alterado (v1: RF-02).

O sistema deve permitir o cadastro de usuários com vínculo a uma clínica e a um perfil de acesso (Superuser, Administrador, Almoxarife ou Controlador Orçamentário).

- O Superuser cadastra usuários de qualquer clínica e de qualquer perfil; o Superuser não tem clínica.
- O Administrador cadastra Administradores e Almoxarifes da própria clínica.
- O Controlador Orçamentário é cadastrado pelo Superuser, um para cada clínica.
- Usuários são inativados e reativados, nunca excluídos, para preservar o histórico.

#### [RF-03] Configuração de permissões

Prioridade: Essencial. Origem: Alterado (v1: RF-03).

O sistema deve permitir configurar permissões por perfil (Superuser, Administrador, Almoxarife e Controlador Orçamentário), em uma matriz de permissão por perfil. Somente o Superuser acessa a área de Configurações.

- Permissões configuráveis: registrar saídas e devoluções; registrar entradas; ajustar inventário; estornar movimentações; cadastrar insumos, categorias e pacotes; cadastrar usuários; cadastrar clínicas; relatórios e exportação; configurações; ver valores monetários; editar custo unitário.
- Os valores iniciais da matriz estão no Anexo A.

#### [RF-04] Parâmetros de cálculo e de alerta

Prioridade: Importante. Origem: Novo.

O sistema deve permitir ao Superuser ajustar, para toda a rede, os parâmetros que alimentam os cálculos e os alertas.

- Margem de segurança do nível crítico (padrão 20%).
- Múltiplo da média diária que caracteriza retirada muito acima da média (padrão 3×).
- Queda de consumo, em relação à média aprendida, que dispara alerta (padrão 50%).
- Prazo, em dias, para decidir sobre recebimento incorreto sem troca (padrão 45).

#### [RF-05] Cadastro de insumos

Prioridade: Essencial. Origem: Alterado (v1: RF-04).

O sistema deve permitir o cadastro simplificado de insumos. O código do insumo é gerado pelo sistema; o usuário informa os demais campos.

- Obrigatórios: nome, categoria (da clínica), unidade de medida e tempo de reposição estimado, em dias.
- Opcional: registrar temperatura de armazenamento (refrigerado, ambiente ou congelado).
- Opcional: controle de lote e validade (marcado por padrão). Quando marcado, informa-se a antecedência do alerta de validade, em dias.
- O fornecedor habitual deixa de fazer parte do cadastro.
- Insumos são inativados e reativados, nunca excluídos.

#### [RF-06] Categorias de insumo por clínica

Prioridade: Importante. Origem: Novo.

O sistema deve permitir que cada clínica crie e renomeie as suas categorias de insumo. Ao renomear uma categoria, os insumos que a usam acompanham o novo nome. Categorias de movimentação não são editáveis (são nove, fixas).

- Esta interpretação de "editar categorias por clínica" está registrada como ponto em aberto (seção 6).

#### [RF-07] Cadastro de pacote de insumos

Prioridade: Importante. Origem: Alterado (v1: RF-06).

O sistema deve permitir o cadastro de pacotes de insumos, por grupo de material, com a lista de insumos e as quantidades padrão consumidas em cada um. O termo "pacote de insumos" substitui "procedimento padrão".

#### [RF-08] Antecedência dos alertas de validade

Prioridade: Importante. Origem: Alterado (v1: RF-09).

O sistema deve permitir configurar, por insumo, quantos dias antes do vencimento o alerta de validade é emitido, conforme o uso do item. Um padrão por categoria fica para fase futura.

### 2.2. Gestão de saídas de estoque

#### [RF-09] Retirada de insumos

Prioridade: Essencial. Origem: Alterado (v1: RF-10).

O sistema deve permitir a retirada de insumos do estoque escolhendo o insumo pelo seu código, com registro de quantidade, categoria da saída e motivo.

- Categorias de saída: consumo, descarte por avaria, empréstimo, doação e perda por validade.
- Empréstimo e doação exigem o destinatário. Exceto no consumo, o motivo é obrigatório.
- Perda por validade só incide sobre lotes vencidos.

#### [RF-10] Escolha de lote (FEFO)

Prioridade: Essencial. Origem: Novo (parte do v1: RF-14).

Ao registrar uma saída de insumo com controle de lote, o sistema deve sugerir o lote com a validade mais próxima (FEFO). O usuário pode escolher outro lote; nesse caso o Administrador da clínica é notificado (RF-28). Lotes vencidos ficam bloqueados para consumo.

- A validade mais próxima aparece em destaque no Estoque, no Painel e na escolha de lote.

#### [RF-11] Baixa de pacote de insumos

Prioridade: Importante. Origem: Alterado (v1: RF-11).

O sistema deve dar baixa dos insumos previstos em um pacote de insumos, informada a quantidade de pacotes. A baixa usa o FEFO para cada insumo.

#### [RF-12] Ajuste de quantidades antes da baixa

Prioridade: Importante. Origem: Mantido (v1: RF-12).

O sistema deve permitir ajustar as quantidades sugeridas pelo pacote antes de confirmar a baixa, exigindo justificativa.

#### [RF-13] Devolução

Prioridade: Importante. Origem: Novo.

O sistema deve permitir registrar a devolução de um item que foi retirado e não foi utilizado. O item volta a ser cadastrado no estoque, no mesmo lote ou em um lote novo. A devolução é um item próprio do menu, no mesmo nível de Saídas e Entradas.

- Campos: código do insumo, quantidade devolvida, lote, validade (quando o lote é novo) e pessoa que retirou e devolveu, em texto livre.
- A devolução é uma categoria de movimentação e reduz o consumo líquido do insumo.

#### [RF-14] Log de movimentações

Prioridade: Essencial. Origem: Alterado (v1: RF-13).

O sistema deve manter log de toda movimentação, e não apenas de baixas, com usuário, data, hora, insumo, lote, quantidade, categoria, motivo e origem. As nove categorias de movimentação são: consumo, perda por validade, descarte por avaria, empréstimo, doação, entrada, estorno, ajuste de inventário e devolução.

- A consulta permite filtrar por texto (insumo, código, usuário ou motivo), categoria, usuário e período (data inicial e final).
- O histórico é mantido por no mínimo cinco anos (RNF-02).

#### [RF-15] Perdas e descartes

Prioridade: Importante. Origem: Mantido (v1: RF-15).

O sistema deve permitir registrar perdas por validade e descartes por avaria, diferenciando-os do consumo regular. Há um atalho para descartar de uma vez todos os lotes vencidos, que passam a não compor o saldo.

#### [RF-16] Estorno de movimentação

Prioridade: Importante. Origem: Mantido (v1: RF-16).

O sistema deve permitir estornar uma saída registrada por engano, mantendo ambos os lançamentos (a saída e o estorno) no histórico. Quem tem a permissão de estorno estorna saídas de qualquer usuário; quem não a tem estorna apenas a própria saída, em até 24 horas.

#### [RF-17] Ajuste de inventário

Prioridade: Importante. Origem: Mantido (v1: RF-17).

O sistema deve permitir ajustar a quantidade de um lote após contagem física, com justificativa obrigatória. O ajuste gera uma movimentação da categoria "ajuste de inventário".

### 2.3. Entradas de estoque

#### [RF-18] Entrada de itens por origem

Prioridade: Essencial. Origem: Alterado (v1: RF-18).

O sistema deve oferecer formulário de entrada de itens por origem. A prioridade deste requisito não estava marcada no documento anterior; é a única forma de o saldo crescer e foi classificado como Essencial.

- Origens: almoxarifado central, outra clínica (apenas registro da origem), doação externa e outro (com descrição).
- Doação externa exige a carta do doador, anexada. Comprovante é opcional em qualquer origem.
- Informam-se a data do pedido (opcional, usada no tempo de reposição) e a data do recebimento.
- Cada linha traz o código do insumo, a quantidade recebida e, para insumos com controle de lote, o lote e a validade.

#### [RF-19] Consulta de estoque

Prioridade: Essencial. Origem: Alterado (v1: RF-19).

O sistema deve manter atualizada, a cada movimentação, a relação de insumos e saldos da clínica, com consulta por filtros e ordenação.

- Colunas: insumo, saldo (com o saldo utilizável quando há lote vencido), validade mais próxima, nível crítico, cobertura em dias e situação.
- Filtros: texto, categoria, situação, validade, controle de lote, temperatura e cobertura máxima. A ordenação é feita pelo título de cada coluna.
- Lote vencido é sinalizado por um triângulo de alerta ao lado da validade.

#### [RF-20] Cálculo do tempo de reposição (lead time)

Prioridade: Importante. Origem: Mantido (v1: RF-20).

O sistema deve calcular o tempo médio entre o pedido de um insumo e o seu recebimento (RN-03). Enquanto não houver entradas com data de pedido, vale o tempo de reposição estimado no cadastro.

#### [RF-21] Solicitações de insumo

Prioridade: Desejável. Origem: Mantido (v1: RF-21).

O sistema deve integrar-se ao sistema de solicitações para obter a data de pedido e os itens pedidos. Nesta fase a integração é simulada por requisições fictícias; a entrada pode ser importada de uma requisição.

#### [RF-22] Conferência do recebimento

Prioridade: Desejável. Origem: Mantido (v1: RF-23).

Quando a entrada é importada de uma requisição, o sistema deve permitir conferir o recebimento e registrar a divergência entre o pedido e o entregue.

#### [RF-23] Nota de recebimento

Prioridade: Importante. Origem: Alterado (v1: RF-24).

O sistema deve emitir uma nota de recebimento ao completar uma entrada. Uma nota pode ter mais de um insumo.

- Campos: origem, datas do pedido e do recebimento, anexos, e, por insumo, quantidade, lote e validade.
- O valor total e o custo por linha só aparecem na visão orçamentária (RF-44).
- A nota pode ser exportada em PDF ou Excel.

#### [RF-24] Estorno da nota de recebimento

Prioridade: Importante. Origem: Alterado (v1: RF-25).

O sistema deve permitir estornar uma nota de recebimento, com justificativa. O saldo é revertido e o estorno fica no histórico. Regra de negócio: RN-06.

#### [RF-25] Recebimentos incorretos

Prioridade: Importante. Origem: Novo.

O sistema deve permitir registrar o produto recebido errado que a empresa fornecedora ainda não trocou, e acompanhar o prazo para a troca.

- Campos: descrição do produto, quantidade, unidade, empresa fornecedora, data da notificação à empresa e observações.
- O produto fica guardado pelo Almoxarife. Passado o prazo (padrão 45 dias da notificação), o sistema emite alerta ao Administrador e ao Almoxarife.
- Decisões possíveis: registrar a troca realizada, incorporar o produto ao estoque da clínica ou descartá-lo.

### 2.4. Notificação do usuário

#### [RF-26] Notificação de nível crítico

Prioridade: Essencial. Origem: Alterado (v1: RF-24 (notificação)).

O sistema deve notificar quando um insumo atingir nível crítico igual ou superior a 7, em uma escala de 0 a 10, ou ficar sem saldo utilizável (RN-01).

#### [RF-27] Notificação de validade

Prioridade: Essencial. Origem: Mantido (v1: RF-25 (notificação)).

O sistema deve notificar quando um lote se aproximar da validade, dentro da antecedência definida para o insumo, e quando um lote vencer.

#### [RF-28] Alertas de uso

Prioridade: Importante. Origem: Novo.

O sistema deve notificar o Administrador da clínica nas seguintes situações:

- Retirada de um lote que não é o de validade mais próxima (RN-09).
- Retirada muito acima da média diária de consumo do insumo (RN-10). O usuário é avisado na tela antes de confirmar a saída.
- Consumo recente bem abaixo da média aprendida do insumo (RN-11).

#### [RF-29] Central de notificações interna

Prioridade: Importante. Origem: Mantido (v1: RF-27).

O sistema deve manter uma central de notificações interna, com histórico e marcação de lida, acessada pelo sino no cabeçalho, com contador de não lidas. O sino não aparece na visão orçamentária.

#### [RF-30] Preferência de notificações

Prioridade: Importante. Origem: Mantido (v1: RF-28).

O sistema deve permitir que cada usuário escolha quais alertas recebe e por qual canal (central interna, e-mail ou WhatsApp). Por padrão, o e-mail vale só para o nível crítico.

#### [RF-31] Agrupamento de notificações

Prioridade: Desejável. Origem: Mantido (v1: RF-29).

O sistema deve agrupar alertas do mesmo tipo em um resumo, para evitar excesso de mensagens. A frequência do resumo periódico ainda precisa ser definida (seção 6).

#### [RF-32] Notificação externa

Prioridade: Desejável. Origem: Mantido (v1: RF-26).

O sistema deve enviar notificações por e-mail e/ou WhatsApp. Nesta fase os canais são exibidos e simulados; não há envio real.

### 2.5. Visão da rede

#### [RF-33] Privacidade de dados entre clínicas

Prioridade: Essencial. Origem: Mantido (v1: RF-30).

O sistema deve manter os dados de cada clínica isolados, acessíveis apenas por usuários vinculados a ela. A única exceção é o Superuser (RN-13).

#### [RF-34] Visão consolidada do Superuser

Prioridade: Essencial. Origem: Mantido (v1: RF-31 (permissões do superuser)).

O sistema deve oferecer ao Superuser visão consolidada do estoque de todas as clínicas da rede, com a opção de ver uma clínica de cada vez. O Painel da rede resume a situação de cada clínica.

### 2.6. Acesso, auditoria, painel e relatórios

#### [RF-35] Autenticação do usuário

Prioridade: Essencial. Origem: Mantido (v1: RF-36).

O sistema deve exigir autenticação por e-mail institucional e senha. Nesta fase o protótipo usa senha de demonstração, sem servidor.

#### [RF-36] Trilha de auditoria

Prioridade: Essencial. Origem: Alterado (v1: RF-37).

O sistema deve registrar toda operação que altere dados, incluindo cadastros e configurações, com usuário, clínica, data, ação e detalhe. A consulta da trilha por tela não faz parte desta fase.

#### [RF-37] Painel de controle

Prioridade: Essencial. Origem: Alterado (v1: RF-40).

O sistema deve apresentar um painel de controle de acordo com o perfil do usuário.

- Indicadores em itens (não em lotes): itens controlados, em nível crítico, a vencer e com lote vencido.
- Itens em nível crítico, com saldo, nível, cobertura e situação.
- Lotes a vencer e vencidos, em colunas separadas, com a validade colorida (RN-08), e o atalho para descartar lotes vencidos.
- Consumo semanal por clínica e por insumo (Administrador e Superuser). O Almoxarife não vê gráfico nem movimentações recentes.
- Painel da rede para o Superuser, com a situação de cada clínica.
- Na visão orçamentária o painel mostra somente valores (RF-44).

#### [RF-38] Relatório de consumo

Prioridade: Importante. Origem: Alterado (v1: RF-38).

O sistema deve oferecer relatório de consumo por período (7, 30 ou 90 dias), categoria, insumo e clínica, agrupado por insumo, por clínica ou por semana. Em quantidade, o agrupamento por clínica ou semana exige escolher um insumo, porque unidades diferentes não se somam.

#### [RF-39] Relatório de perdas

Prioridade: Importante. Origem: Mantido (v1: RF-39).

O sistema deve oferecer relatório de perdas por validade e por descarte, com os registros do período.

#### [RF-40] Curva ABC

Prioridade: Desejável. Origem: Alterado (v1: RF-42).

O sistema deve oferecer análise de curva ABC dos insumos. Nas telas operacionais a curva é por quantidade consumida; na visão orçamentária, por valor consumido. Classes: A até 80% do acumulado, B até 95% e C o restante.

#### [RF-41] Exportação de relatórios

Prioridade: Desejável. Origem: Alterado (v1: RF-41).

O sistema deve permitir exportar em PDF ou Excel (.xlsx) os relatórios de consumo, perdas e curva ABC, a lista de movimentações e a nota de recebimento. O formato CSV deixa de existir.

- Os arquivos saem com cabeçalho: título, clínica, data e usuário que gerou.
- A exportação respeita os filtros ativos e o recorte do perfil (na visão orçamentária inclui valores e omite quantidades).

### 2.7. Estoque orçamentário

#### [RF-42] Perfil Controlador Orçamentário

Prioridade: Importante. Origem: Novo.

O sistema deve ter o perfil Controlador Orçamentário, vinculado a uma clínica, que acompanha o aspecto monetário do estoque. Há um Controlador para cada clínica.

- Acessa Painel, Estoque, Entradas (apenas as notas de recebimento), Movimentações, Relatórios e Cadastros (apenas insumos, para o custo), sempre da própria clínica.
- É um perfil de consulta: não registra saídas, entradas, devoluções nem ajustes, e não estorna. Sua única edição é o custo unitário dos insumos.
- Vê somente a parte monetária (RF-44).

#### [RF-43] Custo unitário do insumo

Prioridade: Importante. Origem: Novo.

O sistema deve guardar, para cada insumo, um custo unitário de referência em reais, por unidade de medida. O Controlador mantém o custo em Cadastros. Insumos novos nascem sem custo até o Controlador informar.

- Nesta fase o custo é único por insumo; o custo por lote fica para decisão futura (seção 6).
- Toda alteração de custo entra na trilha de auditoria.

#### [RF-44] Visão orçamentária

Prioridade: Importante. Origem: Novo.

O sistema deve oferecer uma visão orçamentária, com telas somente monetárias. Nela não aparecem quantidades, níveis críticos, cobertura, situação, lotes, validades nem alertas de estoque.

- Painel: valor em estoque, em lotes a vencer, em lotes vencidos e perdido nos últimos 30 dias (perda por validade e descarte por avaria); maiores valores em estoque; valor por categoria; consumo semanal em reais, filtrável por clínica (Superuser), categoria, insumo e período (8, 13 ou 26 semanas).
- Estoque ("Valor do estoque"): custo unitário, valor em estoque e valor em lotes vencidos ou a vencer de cada insumo, com busca, categoria e ordenação.
- Entradas: valor total de cada nota e, na nota, custo unitário e total por insumo.
- Movimentações: o valor de cada movimentação no lugar de lote e quantidade.
- Relatórios: consumo, perdas e curva ABC em reais.
- Cadastros: custo unitário de cada insumo, com a ação de editar o custo.

#### [RF-45] Chave de visão orçamentária do Superuser

Prioridade: Importante. Origem: Novo.

O sistema deve oferecer ao Superuser, no menu do ícone de usuário, uma chave para ligar e desligar a visão orçamentária. Ligada, as telas monetárias substituem as operacionais, para a rede inteira ou para a clínica escolhida, e um selo "Visão orçamentária" aparece no cabeçalho.

- Administrador e Almoxarife nunca veem valores monetários.
- O Controlador está sempre na visão orçamentária; para ele não há chave.
- A permissão de ver valores é configurável na matriz do RF-03.

## 3. Regras de negócio

As regras abaixo são citadas pelos requisitos funcionais. Os valores padrão podem ser ajustados pelo Superuser em Configurações (RF-04).

### RN-01 Nível crítico

O nível crítico não é cadastrado: é uma nota de 0 (tranquilo) a 10 (muito crítico), calculada pelo sistema. A nota é 10 quando não há saldo utilizável e 0 quando não há consumo. Nos demais casos compara-se a cobertura (RN-02) com o tempo de reposição (RN-03) acrescido da margem de segurança (padrão 20%): quando a cobertura é igual a esse valor, a nota é 7; quando é três vezes maior ou mais, a nota é 0. A nota é arredondada para um inteiro. O insumo é crítico com nota de 7 a 10, "repor em breve" com 5 ou 6 e adequado abaixo disso. Sem saldo utilizável, o insumo aparece como "sem estoque".

### RN-02 Consumo médio e cobertura

O consumo médio diário é o consumo líquido (consumo menos devoluções) dos últimos 30 dias dividido por 30. A cobertura, em dias, é o saldo utilizável dividido pelo consumo médio diário.

### RN-03 Tempo de reposição (lead time)

É a média, em dias, entre a data do pedido e a data do recebimento nas entradas não estornadas em que o insumo foi recebido. Sem entradas com data de pedido, vale o tempo de reposição estimado no cadastro.

### RN-04 FEFO e lotes vencidos

As saídas sugerem sempre o lote de validade mais próxima entre os lotes não vencidos. Lotes vencidos ficam bloqueados para consumo e só saem do estoque como perda por validade.

### RN-05 Saldo utilizável

O saldo utilizável é o saldo do insumo sem os lotes vencidos. Nível crítico, cobertura e retiradas usam o saldo utilizável.

### RN-06 Estorno da nota de recebimento

A nota só pode ser estornada se nenhum item dos lotes recebidos nela tiver sido movimentado desde a entrada. Caso contrário, o sistema informa o lote e o motivo do bloqueio. O estorno exige justificativa, reverte o saldo e registra uma movimentação de estorno por insumo.

### RN-07 Estorno de movimentação

O estorno cria um novo lançamento que desfaz o anterior; os dois permanecem no histórico. Estornos feitos por quem não tem a permissão de estorno só valem para a própria saída e em até 24 horas.

### RN-08 Situação da validade

Um lote está "vencido" quando a validade já passou, "a vencer" quando faltam dias iguais ou menores que a antecedência de alerta do insumo, e "válido" nos demais casos. A cor da data de validade segue essa situação em todas as telas: verde (válido), âmbar (a vencer) e vermelho (vencido), nas cores de estado do design system.

### RN-09 Retirada fora da validade mais próxima

Se o usuário escolhe um lote diferente do sugerido, a tela avisa antes da confirmação. A saída é registrada e o Administrador da clínica é notificado, com o lote escolhido e o lote que deveria sair primeiro.

### RN-10 Retirada acima da média

Uma retirada é considerada muito acima da média quando a quantidade supera o maior valor entre o múltiplo configurado (padrão 3×) da média diária de consumo do insumo e 1 unidade. A tela avisa o usuário antes da confirmação e o Administrador é notificado.

### RN-11 Consumo abaixo do aprendido

O sistema aprende a média diária de consumo de cada insumo nos dias 15 a 90 anteriores e a compara com a média dos últimos 14 dias. Quando a média aprendida é de pelo menos 0,15 por dia e a queda é igual ou maior que a configurada (padrão 50%), o Administrador é notificado.

### RN-12 Recebimento incorreto sem troca

O prazo conta a partir da data de notificação à empresa fornecedora. Ao completar o prazo configurado (padrão 45 dias) sem a troca, o sistema alerta o Administrador e o Almoxarife e libera as decisões de incorporar ou descartar.

### RN-13 Escopo por clínica

Todo registro pertence a uma clínica. Usuários dos demais perfis enxergam apenas a própria clínica. O Superuser enxerga a rede inteira ou escolhe uma clínica de cada vez.

### RN-14 Valoração

O valor de uma quantidade é a quantidade multiplicada pelo custo unitário de referência do insumo. O valor em estoque inclui os lotes vencidos até que sejam descartados. O valor perdido soma as perdas por validade e os descartes por avaria dos últimos 30 dias, sem os estornados. Insumo sem custo informado vale zero.

### RN-15 Quem vê valores

Valores monetários só aparecem para o Controlador Orçamentário e para o Superuser com a visão orçamentária ligada. Na visão orçamentária, quantidades, níveis críticos, cobertura, situação, lotes, validades e alertas de estoque ficam ocultos.

Exemplo do cálculo do nível crítico (RN-01): um insumo tem saldo utilizável de 20 unidades e consumo médio de 2 por dia (cobertura de 10 dias). O tempo de reposição é de 7 dias e a margem é de 20%, então a cobertura que cobre a reposição é de 8,4 dias. A cobertura é 1,19 vez esse valor, e a nota é 10 x (1 - 1,19 / 3) = 6,0, ou seja, "repor em breve". Se o saldo cair para 16 unidades (cobertura de 8 dias), a nota passa a 7 e o insumo vira crítico.

## 4. Requisitos não funcionais

Nesta versão os requisitos não funcionais também têm prioridade. As prioridades são propostas da equipe e devem ser validadas com o cliente.

- RNF-01 Registro de movimentação (Rastreabilidade; Essencial; Alterado): Toda movimentação deve registrar usuário, data e hora, insumo, lote, quantidade, categoria e motivo.
- RNF-02 Histórico de movimentações (Rastreabilidade; Essencial; Mantido): O histórico de movimentações deve ser mantido por, no mínimo, cinco anos.
- RNF-03 Criptografia de senhas (Segurança; Essencial; Mantido): Senhas devem ser armazenadas com hash e salt, nunca em texto puro.
- RNF-04 Tráfego de servidor (Segurança; Essencial; Mantido): Todo tráfego entre cliente e servidor deve usar HTTPS.
- RNF-05 Controle de acesso (Segurança; Essencial; Alterado): O controle de acesso deve ser baseado em perfis e no vínculo do usuário com a clínica. Valores monetários só podem ser entregues pelo servidor a quem tem a permissão correspondente; ocultar o dado na tela não basta.
- RNF-06 Segurança de dados (Segurança; Essencial; Alterado): O tratamento de dados pessoais deve seguir a LGPD, com base legal e retenção definidas. A retenção do histórico de usuários deve ser alinhada ao RNF-02.
- RNF-07 Rotina de backup (Segurança; Importante; Mantido): Deve haver rotina automática de backup e procedimento de restauração testado.
- RNF-08 Tempo de resposta (Eficiência; Importante; Alterado): Operações de consulta e registro devem responder em até dois segundos em condições normais de uso (a carga de referência será definida com o cliente).
- RNF-09 Usabilidade mobile (Usabilidade; Importante; Alterado): A interface deve ser utilizável em celular, já que o registro costuma ocorrer longe do computador. O menu lateral é recolhível e as tabelas rolam na horizontal em telas estreitas.
- RNF-10 Horário de funcionamento (Disponibilidade; Importante; Mantido): O sistema deve estar disponível no horário de funcionamento das clínicas, com janela de manutenção fora desse período.
- RNF-11 Adição de novas clínicas (Escalabilidade; Importante; Mantido): A arquitetura deve suportar a inclusão de novas clínicas sem alteração de código.
- RNF-12 Acessibilidade (Usabilidade; Importante; Novo): Indicadores de situação devem combinar cor com rótulo ou ícone, nunca só cor. A interface deve ter contraste adequado, ordem de foco coerente e uso por teclado nos fluxos principais.
- RNF-13 Identidade visual (Usabilidade; Importante; Novo): A interface deve seguir o manual de identidade visual da Clínica Digital UFPE e o design system do shell da plataforma (tokens de cor, tipografia Arial, componentes e tema claro e escuro).
- RNF-14 Evolução do modelo de dados (Evolução; Importante; Novo): O modelo de dados deve guardar lote e validade em cada movimentação e ter a clínica como dimensão de todos os registros, para receber a futura transferência entre clínicas e o custo por lote sem migração disruptiva.

## 5. Fora do escopo desta fase

Itens que existiam na versão 1.0 ou foram cogitados e que não fazem parte desta fase. O modelo de dados já deve comportá-los (RNF-14).

- Transferência entre clínicas: Compartilhamento de estoque, notificação do Superuser sobre excedente e falta, fluxo de solicitação, aprovação e confirmação, integridade da transferência e item em trânsito (v1: RF-31*, RF-32, RF-33, RF-34 e RF-35). A origem "outra clínica" na entrada serve só de registro.
- Perfis Técnico e Solicitante: O Técnico foi substituído pelo Almoxarife. O Solicitante deixa de existir: pedidos seguem pelo sistema de solicitações.
- Cadastro de fornecedores e documento fiscal na entrada: A empresa fornecedora só aparece nos recebimentos incorretos. Fornecedor e nota fiscal por entrada podem voltar se o orçamento exigir.
- Orçamento planejado × realizado: A visão orçamentária mostra valores de estoque, perdas e consumo. Orçamento previsto por clínica, aprovação de compras e custo por lote dependem de decisão da gestão.
- Integrações reais: Sistema de solicitações, e-mail e WhatsApp são simulados nesta fase. Integração com agenda, atendimento ou prontuário para a baixa automática de pacotes também fica para depois.
- Consulta da trilha de auditoria por tela: A trilha é gravada, mas a tela de consulta não faz parte desta fase.
- Fluxo de contagem de inventário: Abrir contagem, bloquear movimentações e aprovar divergências. Hoje o ajuste é feito por lote, com justificativa.
- Gestão de senhas: Recuperação e alteração de senha, bloqueio por tentativas e expiração de sessão.
- Padrão de antecedência de validade por categoria: Hoje a antecedência é definida por insumo.

## 6. Pontos em aberto

1. O estoque orçamentário atende à gestão? O protótipo usa um custo unitário de referência por insumo, mantido pelo Controlador. Falta definir se o custo vem da nota fiscal, se varia por lote e se o orçamento previsto por clínica entra neste módulo.
2. O Controlador precisa de alguma ação além de consultar e editar o custo? Hoje ele não aprova compras nem registra movimentações. Definir se deve, por exemplo, aprovar o custo ou exportar para o setor financeiro.
3. Empréstimo precisa de prazo e controle de retorno? Hoje o empréstimo registra só o destinatário. A devolução existente é para item retirado e não utilizado.
4. "Editar categorias por clínica" refere-se às categorias de insumo? Assumido que sim. As categorias de movimentação são fixas (nove).
5. Quem notifica a empresa nos recebimentos incorretos? O sistema registra a data da notificação, mas não a envia. Definir quem faz o contato e se o sistema deve apoiar.
6. Qual a margem de segurança do nível crítico? Padrão de 20%, ajustável. Sugestão: calibrar com 60 dias de dados reais.
7. Com quantos dias de antecedência alertar a validade, e isso varia por categoria? Hoje é definido por insumo. Falta decidir se haverá padrão por categoria.
8. Quais campos do sistema de solicitações estão disponíveis para a integração? O protótipo simula número do pedido, data e itens.
9. O controle por lote é viável na rotina atual? Opcional por insumo; o sistema sugere o lote de validade mais próxima. Sugestão: tornar obrigatório só para itens de validade crítica e medir o tempo de registro.
10. Quem baixa os lotes vencidos? Hoje é manual, com atalho para descartar todos de uma vez. Definir se deve ser automático.
11. Qual a frequência do resumo periódico de notificações? Ainda não definida.
12. A transferência entre clínicas precisará de aprovação do Superuser? Pergunta mantida para a fase futura.

## Anexo A. Perfis, permissões e telas

### A.1. Matriz de permissões inicial

Valores iniciais da matriz do RF-03. O Superuser pode alterá-los em Configurações. Ordem: Superuser, Administrador, Almoxarife, Controlador Orçamentário.

- Registrar saídas (consumo, pacote, descarte, empréstimo, doação) e devolução: Superuser não, Administrador sim, Almoxarife sim, Controlador não
- Registrar entradas e recebimentos incorretos: Superuser não, Administrador sim, Almoxarife sim, Controlador não
- Ajustar inventário (contagem física): Superuser não, Administrador sim, Almoxarife sim, Controlador não
- Estornar movimentações de qualquer usuário: Superuser não, Administrador sim, Almoxarife sim, Controlador não
- Cadastrar insumos, categorias e pacotes: Superuser não, Administrador sim, Almoxarife não, Controlador não
- Cadastrar usuários: Superuser sim (qualquer clínica), Administrador sim (da clínica), Almoxarife não, Controlador não
- Cadastrar clínicas: Superuser sim, Administrador não, Almoxarife não, Controlador não
- Relatórios, curva ABC e exportação: Superuser sim, Administrador sim, Almoxarife não, Controlador sim
- Acessar Configurações (permissões e parâmetros): Superuser sim, Administrador não, Almoxarife não, Controlador não
- Ver valores monetários (visão orçamentária): Superuser sim (com a chave ligada), Administrador não, Almoxarife não, Controlador sim
- Editar o custo unitário dos insumos: Superuser não, Administrador não, Almoxarife não, Controlador sim

### A.2. Telas de cada perfil

O Superuser com a visão orçamentária ligada vê as telas monetárias no lugar das operacionais (inclusive Entradas, só com as notas), e o sino de notificações fica oculto.

- Painel: Superuser Painel da rede; Administrador Painel de controle; Almoxarife Painel (sem gráfico); Controlador Painel orçamentário
- Estoque: Superuser sim; Administrador sim; Almoxarife sim; Controlador Valor do estoque
- Saídas e Devolução: Superuser não; Administrador sim; Almoxarife sim; Controlador não
- Entradas: Superuser não (com a chave ligada: notas); Administrador sim; Almoxarife sim; Controlador Só as notas, com valor
- Movimentações: Superuser sim; Administrador sim; Almoxarife sim; Controlador Com valor
- Relatórios: Superuser sim; Administrador sim; Almoxarife não; Controlador Em reais
- Cadastros: Superuser Clínicas e usuários; Administrador Insumos, categorias, pacotes e usuários; Almoxarife não; Controlador Insumos (custo)
- Configurações: Superuser sim; Administrador não; Almoxarife não; Controlador não
- Notificações (sino): Superuser sim (some com a chave ligada); Administrador sim; Almoxarife sim; Controlador não (oculto)

## Anexo B. Rastreabilidade com a versão 1.0

### B.1. Requisitos da versão 1.0

- RF-01 Cadastro de clínicas (Essencial): Mantido; nesta versão: RF-01.
- RF-02 Cadastro de usuários (Essencial): Alterado; nesta versão: RF-02. Quatro perfis; o Técnico saiu.
- RF-03 Configuração de permissões (Essencial): Alterado; nesta versão: RF-03, RF-04. Quatro perfis; só o Superuser configura.
- RF-04 Cadastro de insumos (Essencial): Alterado; nesta versão: RF-05. Código gerado; sem fornecedor habitual; lote e temperatura opcionais.
- RF-05 Classificação de insumos (Essencial): Removido; nesta versão: RF-06, RF-05. Prioridade, criticidade e classe saíram. Ficaram o tempo de reposição e as categorias por clínica.
- RF-06 Cadastro de pacote (Essencial): Alterado; nesta versão: RF-07. Prioridade reduzida para Importante, igual à da baixa de pacote.
- RF-07 Cadastro de nível crítico (Essencial): Substituído; nesta versão: RF-04. O nível crítico passa a ser calculado (RN-01); não há mínimo nem ressuprimento digitados.
- RF-08 Cadastro de fornecedores (Desejável): Removido; nesta versão: sem equivalente. A empresa fornecedora só aparece em recebimentos incorretos.
- RF-09 Antecedência de alertas (Desejável): Alterado; nesta versão: RF-08. Subiu para Importante: sem ela a notificação de validade não funciona.
- RF-10 Retirada manual de insumos (Essencial): Alterado; nesta versão: RF-09, RF-10. Pelo código, com lote sugerido.
- RF-11 Baixa automática de insumos (Desejável): Alterado; nesta versão: RF-11. Subiu para Importante, alinhada ao cadastro de pacotes.
- RF-12 Ajuste de quantidades sem baixa (Importante): Mantido; nesta versão: RF-12.
- RF-13 Log de movimentações (Essencial): Alterado; nesta versão: RF-14. Todas as movimentações, em nove categorias.
- RF-14 Controle de itens (Essencial): Alterado; nesta versão: RF-10, RF-05. Passa a valer só para insumos com controle de lote; FEFO explícito.
- RF-15 Perdas e descartes (Importante): Mantido; nesta versão: RF-15.
- RF-16 Baixa acidental (Importante): Mantido; nesta versão: RF-16.
- RF-17 Ajuste de inventário (Importante): Mantido; nesta versão: RF-17.
- RF-18 Adição manual de itens (sem prioridade): Alterado; nesta versão: RF-18. Marcado como Essencial. Entrada por origem, com carta do doador e comprovante.
- RF-19 Relatório de produtos (Essencial): Alterado; nesta versão: RF-19. Consulta de estoque com filtros e ordenação.
- RF-20 Cálculo de lead time (Importante): Mantido; nesta versão: RF-20.
- RF-21 Solicitações de insumo (Desejável): Mantido; nesta versão: RF-21. Simulado nesta fase.
- RF-22 Armazenamento de fornecedor e nota fiscal (Desejável): Substituído; nesta versão: RF-18. Substituído por origem da entrada e comprovante opcional.
- RF-23 Double check de incremento (Desejável): Mantido; nesta versão: RF-22.
- RF-24 Nota de recebimento (Importante): Alterado; nesta versão: RF-23. Sem valor total nas telas operacionais; valor na visão orçamentária.
- RF-25 Estorno da nota de recebimento (Importante): Alterado; nesta versão: RF-24. Regra mais simples: só se nenhum item do lote foi movimentado.
- RF-24 (notif.) Notificação de nível crítico (Essencial): Alterado; nesta versão: RF-26. ID duplicado na v1. Nível crítico de 0 a 10; notifica a partir de 7.
- RF-25 (notif.) Notificação de validade (Essencial): Mantido; nesta versão: RF-27. ID duplicado na v1.
- RF-26 Notificação externa (Desejável): Mantido; nesta versão: RF-32. Simulada nesta fase.
- RF-27 Central de notificações interna (Importante): Mantido; nesta versão: RF-29. Acesso pelo sino do cabeçalho.
- RF-28 Preferência de notificações (Importante): Mantido; nesta versão: RF-30.
- RF-29 Agrupamento de notificações (Desejável): Mantido; nesta versão: RF-31.
- RF-30 Privacidade de dados (Essencial): Mantido; nesta versão: RF-33.
- RF-31 (perm.) Permissões do superuser (Essencial): Mantido; nesta versão: RF-34. ID duplicado na v1.
- RF-31 (compart.) Compartilhamento de estoque entre clínicas (Essencial): Adiado; nesta versão: sem equivalente. Fase futura (seção 5).
- RF-32 Notificação do superuser (Essencial): Adiado; nesta versão: sem equivalente. Fase futura.
- RF-33 Transferência de insumos entre clínicas (Importante): Adiado; nesta versão: sem equivalente. Fase futura.
- RF-34 Integridade da transferência (Importante): Adiado; nesta versão: sem equivalente. Fase futura.
- RF-35 Caráter da transferência (Desejável): Adiado; nesta versão: sem equivalente. Fase futura.
- RF-36 Autenticação do usuário (Essencial): Mantido; nesta versão: RF-35.
- RF-37 Auditoria de dados (Essencial): Alterado; nesta versão: RF-36. A trilha é gravada; a tela de consulta ficou fora desta fase.
- RF-38 Relatórios de consumo (Importante): Alterado; nesta versão: RF-38.
- RF-39 Relatório de perdas (Importante): Mantido; nesta versão: RF-39.
- RF-40 Painel de controle (Essencial): Alterado; nesta versão: RF-37. Itens e não lotes; visões por perfil.
- RF-41 Export de relatórios (Desejável): Alterado; nesta versão: RF-41. PDF e Excel; o CSV saiu.
- RF-42 Análise de dados (Desejável): Alterado; nesta versão: RF-40. Por quantidade; por valor na visão orçamentária.

### B.2. Requisitos novos desta versão

- RF-04 Parâmetros de cálculo e de alerta
- RF-06 Categorias de insumo por clínica
- RF-13 Devolução
- RF-25 Recebimentos incorretos
- RF-28 Alertas de uso
- RF-42 Perfil Controlador Orçamentário
- RF-43 Custo unitário do insumo
- RF-44 Visão orçamentária
- RF-45 Chave de visão orçamentária do Superuser

### B.3. Requisitos não funcionais

RNF-01 a RNF-11 mantêm os IDs da versão 1.0. RNF-01, RNF-05, RNF-06, RNF-08 e RNF-09 tiveram a redação ampliada; RNF-12, RNF-13 e RNF-14 são novos.
