# Backlog do módulo Estoque e insumos (uso interno)

**Interno da equipe. Não compartilhar com o cliente nem commitar em repositório visível a ele.**

Base: requisitos v2.0 (`requirements.md`) e contrato de APIs (`api-contract.md`). Sem estimativas: elas saem do planejamento com o time.

Legenda: **[E]** Essencial, **[I]** Importante, **[D]** Desejável (prioridades dos requisitos). Os critérios de aceite estão no formato Dado, Quando, Então, abreviados.

## Visão geral

| Épico | Tema | Sprint sugerida | Requisitos |
| --- | --- | --- | --- |
| E0 | Fundação técnica | 0 | RF-35, RNF-03, 04, 05, 13, 14 |
| E1 | Acesso, rede e auditoria | 1 | RF-01, 02, 03, 33, 34, 36 |
| E2 | Cadastros e parâmetros | 1 | RF-04, 05, 06, 07, 08 |
| E3 | Consulta do estoque | 1 | RF-19 |
| E4 | Saídas e movimentações | 2 | RF-09 a 17 |
| E5 | Entradas e recebimentos | 3 | RF-18, 20 a 25 |
| E6 | Alertas e notificações | 4 | RF-26 a 32 |
| E7 | Painel e relatórios | 4 e 5 | RF-37 a 41 |
| E8 | Visão orçamentária | 5 | RF-42 a 45 |
| E9 | Qualidade e implantação | contínuo e 6 | RNF-02, 06 a 12 |

Sugestão de MVP para o piloto: E0 a E4 e os [E] de E5, E6 e E7. A visão orçamentária (E8) segue as decisões 1 e 2 de `architecture.md`.

---

## E0. Fundação técnica (Sprint 0)

**E0-H1 Repositório e esteira.** Como time, quero o repositório do módulo com CI. [E]
- Dado um merge request, então lint, testes e build rodam e bloqueiam o merge se falharem.
- O módulo sobe isolado nas portas reservadas (front 5175, API 3002, banco 5434).

**E0-H2 Remote no shell.** Como usuário, quero abrir o módulo em `/supplies`. [E]
- Dado o shell, quando abro `/supplies`, então `suppliesMfe/App` carrega com o tema do shell.
- Se o módulo cair, o shell mostra o aviso de falha e continua funcionando.

**E0-H3 Modelo de dados base (RNF-14).** [E]
- Toda tabela tem a clínica como dimensão e toda movimentação guarda lote e validade.
- Migrations versionadas e carga de dados de demonstração.

**E0-H4 Autenticação e perfis (RF-35, RNF-05).** [E]
- Dado o cookie de sessão do shell, então o módulo identifica usuário, perfil e clínica.
- A API responde 403 fora do perfil ou da clínica, com teste automatizado por perfil.
- O módulo valida o token JWT do IAM (claims `sub`, `profile`, `clinic_ids`); em desenvolvimento, usa os cabeçalhos `x-dev-*`.

**E0-H5 Contrato OpenAPI e mocks.** [E]
- Contrato 1.0 publicado, cliente gerado e `api:check` sem divergência.
- As APIs de outros módulos (IAM, Organização, Solicitações, Notificações, Arquivos, Auditoria) têm mock até a integração.

## E1. Acesso, rede e auditoria (Sprint 1)

**E1-H1 Clínicas (RF-01).** [E]
- O Superuser cria, edita e inativa clínicas sem alterar código (RNF-11).
- Clínica inativa sai das seleções e mantém o histórico.

**E1-H2 Usuários (RF-02).** [E]
- Usuários, perfis e vínculo com clínica são do IAM (decisão D1); o módulo mantém o cache de id, nome e perfil por evento `iam.user.*`.
- Usuário inativado no IAM não registra mais retiradas; o histórico é preservado. O módulo não cria usuários.

**E1-H3 Permissões (RF-03).** [E]
- O Superuser ajusta a matriz perfil → escopos do módulo (Anexo A.1) e a mudança vale na requisição seguinte.
- Toda alteração entra na auditoria.

**E1-H4 Isolamento e visão da rede (RF-33, RF-34, RN-13).** [E]
- Dado um usuário que não é Superuser, então nenhuma resposta traz dado de outra clínica, inclusive trocando ids na chamada.
- O Superuser escolhe a rede inteira ou uma clínica e vê os indicadores consolidados.

**E1-H5 Trilha de auditoria (RF-36).** [E]
- Criar, alterar, estornar e configurar gravam usuário, data e hora, entidade e detalhe, sem poder editar o registro.
- A tela de consulta fica fora desta fase.

## E2. Cadastros e parâmetros (Sprint 1)

**E2-H1 Insumos (RF-05).** [E]
- Código único por clínica, nome, categoria, unidade, controle de lote e validade opcional, temperatura opcional e tempo de reposição estimado.
- Insumo inativo não recebe movimentação e mantém o histórico.

**E2-H2 Categorias por clínica (RF-06).** [I]
- Renomear uma categoria atualiza os insumos dela.
- Não é possível inativar categoria que tenha insumo ativo.

**E2-H3 Pacotes de insumos (RF-07).** [I]
- Pacote é uma lista de insumos com quantidades padrão, por clínica, com ativar e inativar.

**E2-H4 Antecedência de validade (RF-08).** [I]
- A antecedência é definida por insumo e alimenta a situação "a vencer" (RN-08). Padrão de 30 dias, sem padrão por categoria.

**E2-H5 Parâmetros de cálculo e alerta (RF-04).** [I]
- O Superuser ajusta margem (20%), múltiplo de retirada (3×), queda de consumo (50%) e prazo do recebimento incorreto (45 dias).
- Valores fora da faixa são recusados e cada mudança é auditada.

## E3. Consulta do estoque (Sprint 1)

**E3-H1 Lista de estoque (RF-19, RN-05).** [E]
- Mostra saldo, saldo utilizável, validade mais próxima, nível crítico, cobertura e situação.
- Busca, filtros (categoria, situação, validade, lote, temperatura) e ordenação; contador "Exibindo N de M".
- Sem resultado, mostra o estado vazio com a ação de limpar filtros.

**E3-H2 Lotes do insumo (RN-08).** [E]
- Lista cada lote com validade e situação (válido, a vencer, vencido), sempre com cor e rótulo.
- Lote vencido não entra no saldo utilizável.

## E4. Saídas e movimentações (Sprint 2)

**E4-H1 Retirada com FEFO (RF-09, RF-10, RN-04).** [E]
- Dado um insumo com lotes, quando informo código e quantidade, então o sistema sugere o lote não vencido de validade mais próxima.
- Quantidade acima do saldo utilizável bloqueia com mensagem; a baixa pode passar por mais de um lote.
- Tipos: consumo, descarte, empréstimo e doação (empréstimo e doação exigem o destinatário).

**E4-H2 Avisos de retirada (RN-09, RN-10).** [E]
- Lote diferente do sugerido ou quantidade acima de max(3× a média diária, 1): a tela avisa antes de confirmar.
- Confirmada, a saída é registrada e o Administrador é notificado com os detalhes.

**E4-H3 Pacote de insumos (RF-11, RF-12).** [I]
- A baixa do pacote desconta todos os itens vezes a quantidade de pacotes; se um item não tem saldo, nada é baixado.
- Alterar uma quantidade exige justificativa de pelo menos 5 caracteres.
- Baixas vindas de execuções de procedimento chegam como proposta pendente que o usuário confirma ou ajusta; cada clínica pode ligar a confirmação automática (desligada por padrão, decisão D4).

**E4-H4 Devolução (RF-13).** [I]
- O item volta ao lote original ou a um lote novo (com lote e validade) e exige o nome de quem retirou e devolveu.
- A devolução abate o consumo (RN-02).

**E4-H5 Perdas e descartes (RF-15).** [I]
- Descarte por avaria exige motivo.
- Lotes vencidos só saem como perda por validade, com confirmação, em lote ou um a um.

**E4-H6 Log de movimentações (RF-14, RNF-01).** [E]
- Toda movimentação grava usuário, data e hora, insumo, lote, quantidade, categoria (nove) e motivo.
- Filtros por período, insumo, categoria e usuário, com paginação.

**E4-H7 Estorno de movimentação (RF-16, RN-07).** [I]
- O estorno cria o lançamento oposto; os dois permanecem no histórico e exige motivo.
- Quem não tem a permissão só estorna a própria saída, em até 24 horas.
- Uma movimentação não é estornada duas vezes.

**E4-H8 Ajuste de inventário (RF-17).** [I]
- Ajuste por lote com justificativa, registrado como movimentação com a diferença, só para quem tem permissão.

## E5. Entradas e recebimentos (Sprint 3)

**E5-H1 Entrada por origem (RF-18).** [E]
- Origens: almoxarifado central, outra clínica (só registro), doação e outra. Doação exige a carta do doador.
- A data de recebimento não pode ser futura e o pedido não pode ser posterior ao recebimento.
- Insumo com controle de lote exige lote e validade; a entrada gera a nota.

**E5-H2 Tempo de reposição (RF-20, RN-03).** [I]
- Média entre pedido e recebimento nas entradas não estornadas; sem dados vale o estimado do cadastro.
- Recalcula quando uma nota é estornada.

**E5-H3 Nota de recebimento e conferência (RF-23, RF-22).** [I e D]
- Nota numerada com os itens, a origem e as datas; divergência entre pedido e recebido aparece destacada.
- Exportável em PDF e Excel.

**E5-H4 Estorno da nota (RF-24, RN-06).** [I]
- Só é permitido se nenhum item dos lotes da nota foi movimentado; senão, o sistema informa o lote e o motivo.
- Exige justificativa, reverte o saldo e registra um estorno por insumo.

**E5-H5 Recebimentos incorretos (RF-25, RN-12).** [I]
- Registra empresa, data da notificação e motivo; estados: aguardando troca, trocado, incorporado e descartado.
- Aos 45 dias sem troca, alerta Administrador e Almoxarife e libera incorporar ou descartar.
- A equipe notifica a empresa fora do sistema; o sistema só registra a data e alerta aos 45 dias.

**E5-H6 Solicitações de insumo (RF-21).** [D]
- Importar uma requisição preenche itens, quantidades e data do pedido e marca a requisição como atendida.
- Usa um adaptador simulado com os campos mínimos (número, data e itens).

## E6. Alertas e notificações (Sprint 4)

**E6-H1 Cálculo do nível crítico (RN-01, RN-02).** [E]
- Nota de 0 a 10; 10 sem saldo utilizável e 0 sem consumo.
- Caso de teste do documento: saldo 20, consumo 2 por dia, reposição de 7 dias e margem de 20% dá nota 6.
- Notas de 7 ou mais são "crítico", de 5 a 6 "repor em breve".

**E6-H2 Notificação de nível crítico (RF-26).** [E]
- Ao chegar a 7 ou mais, notifica os perfis definidos no RF-26.

**E6-H3 Notificação de validade (RF-27, RN-08).** [E]
- Lote "a vencer" ou vencido gera notificação.
- A cor da data de validade é a mesma em todas as telas.

**E6-H4 Alertas de uso (RF-28, RN-11).** [I]
- Média aprendida (dias 15 a 90) de pelo menos 0,15 por dia e queda de 50% ou mais nos últimos 14 dias notifica o Administrador.
- Executa em rotina diária.

**E6-H5 Caixa de entrada de alertas (RF-29).** [I]
- Sino com contador e lista, lidos da caixa de entrada da plataforma por um adaptador (decisão D2); marcar como lida é feito na plataforma. Não aparece na visão orçamentária.

**E6-H6 Preferências (RF-30).** [I]
- Por tipo de alerta e canal (aplicativo, e-mail, WhatsApp), guardadas na plataforma. O módulo registra as categorias de alerta e os canais padrão: aplicativo ligado e e-mail só para nível crítico.

**E6-H7 Envio, agrupamento e canal externo (RF-31, RF-32).** [D]
- O módulo envia cada alerta com chave de agrupamento e de repetição; o agrupamento, o resumo semanal (segunda-feira) e os canais e-mail e WhatsApp são da plataforma.
- Adaptador simulado até a API de Notificações existir.

## E7. Painel e relatórios (Sprints 4 e 5)

**E7-H1 Painel de controle (RF-37).** [E]
- Itens controlados, em nível crítico, a vencer e com lote vencido; listas de críticos e de validades próximas; gráfico de consumo semanal.
- Os atalhos abrem o estoque já filtrado.

**E7-H2 Relatórios de consumo e de perdas (RF-38, RF-39).** [I]
- Período, categoria e agrupamento (insumo, clínica ou semana); perdas por validade e por avaria sem os estornados.
- Insumos com unidades diferentes nunca são somados.

**E7-H3 Curva ABC (RF-40).** [D]
- Classifica os insumos por quantidade consumida no período.

**E7-H4 Exportação (RF-41).** [D]
- PDF e Excel respeitando os filtros da tela; sem dados, mostra aviso em vez de arquivo vazio.
- Exportação assíncrona (resposta 202) gerada no servidor, com o arquivo guardado pelo módulo de Arquivos (adaptador simulado).

## E8. Visão orçamentária (Sprint 5)

**E8-H1 Perfil Controlador Orçamentário (RF-42).** [I]
- Vê só as telas monetárias da sua clínica e não registra movimentações (a API recusa).

**E8-H2 Custo unitário (RF-43).** [I]
- O Controlador mantém o custo de referência de cada insumo; cada mudança é auditada.
- Insumo sem custo vale zero.

**E8-H3 Telas monetárias (RF-44, RN-14, RN-15).** [I]
- Valor em estoque (inclui vencidos até serem descartados), valor perdido dos últimos 30 dias sem estornados e consumo em reais.
- Quantidades, níveis críticos, cobertura, lotes, validades e alertas ficam ocultos.
- Exportação das telas monetárias em PDF e Excel.

**E8-H4 Chave do Superuser (RF-45, RNF-05).** [I]
- Ligada, o Superuser vê as telas monetárias; desligada, a API não entrega nenhum valor monetário.
- Teste automatizado para cada perfil.

## E9. Qualidade e implantação (contínuo e Sprint 6)

**E9-H1 Retenção, LGPD e backup (RNF-02, 06, 07).** [E e I]
- Histórico por 5 anos no mínimo; base legal e retenção de dados pessoais definidas.
- Backup automático com restauração testada.

**E9-H2 Desempenho e disponibilidade (RNF-08, 10).** [I]
- Consulta e registro em até 2 segundos na carga de referência (a definir); janela de manutenção fora do horário das clínicas.

**E9-H3 Acessibilidade, celular e identidade visual (RNF-09, 12, 13).** [I]
- axe-core sem violações nas telas, uso por teclado nos fluxos principais, cor sempre com rótulo.
- Telas utilizáveis no celular; tokens e tema do shell.

**E9-H4 Carga inicial e piloto.** [E]
- Importação dos insumos e saldos da clínica piloto e treinamento do Almoxarife.
- Revisar a margem do nível crítico com 60 dias de dados reais (decisão 6).

---

## Decisões que orientam as histórias

As decisões completas estão em `architecture.md` e na seção 9 do contrato. As que mais mexem nas histórias:

| Decisão | Afeta |
| --- | --- |
| D1: o IAM é dono de usuários, perfis e vínculo; token JWT | E0-H4, E1-H2, E1-H3 |
| D2: caixa de entrada e preferências são da plataforma | E6-H5, E6-H6, E6-H7 |
| D4: baixa por procedimento é proposta pendente | E4-H3 |
| D6: eventos com outbox, deduplicação e fila de descarte | E4-H1, E5-H1, E6-H2 a E6-H4 |
| D7: o Estoque mantém a própria trilha de auditoria | E1-H5 |
| D8 e D10: custo por insumo mantido pelo Controlador | E8 inteiro |
| D11: empréstimo só com destinatário | E4-H1 |
| D13: notificação à empresa fora do sistema | E5-H5 |
| Margem de 20% e antecedência de 30 dias, ajustáveis | E2-H4, E2-H5, E6-H1 |
| Exportação assíncrona em PDF e Excel | E5-H3, E7-H4 |

## Definição de pronto (proposta)

- Critérios de aceite cobertos por testes automatizados; regras de negócio com casos de borda.
- Contrato OpenAPI atualizado e sem divergência.
- Revisão de código aprovada, acessibilidade verificada e demonstração feita.
- Permissões e isolamento por clínica testados para os 4 perfis.
