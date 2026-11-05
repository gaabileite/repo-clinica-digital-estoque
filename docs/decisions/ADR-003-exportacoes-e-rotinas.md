# ADR-003: Exportações de relatório e rotinas agendadas

## Status
Proposto

## Contexto
Os relatórios saem em PDF e Excel (RF-41). O contrato prevê exportação assíncrona (`POST report-exports`, 202) e uma varredura diária (`POST internal/jobs/daily-scan`) para validade, consumo aprendido e prazo dos recebimentos incorretos, chamada pelo agendador da plataforma. O protótipo gera os arquivos no navegador carregando bibliotecas de um CDN.

## Decisão (a tomar)
- Onde gerar PDF e Excel: no servidor (consistente com o contrato e com dados grandes) ou no navegador (mais simples, mas depende de bibliotecas no cliente).
- Quem agenda a varredura diária: o agendador da plataforma (como no contrato) ou uma rotina própria do módulo.
- Onde guardar os arquivos gerados: módulo de Arquivos (URL assinada de 300 s, como no contrato).

## Consequências
Gerar no servidor exige fila ou execução assíncrona e armazenamento de arquivos; gerar no navegador evita isso, mas o contrato precisaria mudar.
