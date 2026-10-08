# Andén — Belgrano Norte

[![Abrir app](https://img.shields.io/badge/demo-abrir%20app-2563eb)](https://tren-belgrano-norte-app.pages.dev)
[![Licença: MIT](https://img.shields.io/badge/licença-MIT-green.svg)](LICENSE) · [Código no GitHub](https://github.com/maitekenupp/tren-belgrano-norte-app)

Andén é um app web independente para consultar mais rápido os horários previstos do trem Belgrano Norte. A ideia é ver tanto as próximas partidas de uma estação quanto os horários futuros de uma viagem entre duas estações, sem precisar procurar manualmente em uma tabela extensa.

> **Abrir o app:** [tren-belgrano-norte-app.pages.dev](https://tren-belgrano-norte-app.pages.dev)
>
> Os horários são programados e vêm da tabela local do projeto. O app não recebe dados de posição nem informações de atraso em tempo real. Confira sempre as informações oficiais antes de viajar.

## O que dá para fazer

- Ver as próximas partidas a partir de uma estação, considerando o relógio local do dispositivo.
- Consultar horários futuros de uma estação por dia de serviço: dias úteis, sábados e domingos/feriados.
- Escolher origem e destino para comparar a hora de saída e a hora prevista de chegada.
- Corrigir automaticamente o sentido do trem de acordo com a ordem das estações.
- Salvar estações favoritas no navegador.
- Usar o layout em computador ou celular.

## Rodar localmente

**Requisitos:** Node.js 18 ou superior. O app não usa dependências externas.

```bash
git clone https://github.com/maitekenupp/tren-belgrano-norte-app.git
cd tren-belgrano-norte-app
npm run dev
```

Abra [http://localhost:4173](http://localhost:4173). Para encerrar o servidor, pressione `Ctrl+C` no terminal.

Para testar pelo celular na mesma rede Wi-Fi, abra o endereço de rede local mostrado pelo servidor no terminal, mantendo o computador ligado e o servidor ativo.

## Como os horários funcionam

A tabela está em `src/data/schedule.json`, organizada por estação, sentido e dia de serviço. O app compara essas horas com o relógio do dispositivo para calcular a contagem regressiva e exibe as partidas futuras. A comparação origem-destino usa os horários previstos do mesmo trem nas duas estações.

Os horários atualmente incluídos foram transcritos do **Horario N° 21**, com vigência indicada a partir de 19/05/2026. Eles não representam o movimento real dos trens e podem ficar desatualizados.

## Tecnologias

- HTML, CSS e JavaScript sem framework
- Node.js com módulos nativos para servir o app localmente
- JSON para a tabela de horários

## Licença

O código original do app é distribuído sob a licença MIT: você pode usar, copiar, modificar e redistribuí-lo conforme os termos de [LICENSE](LICENSE). O arquivo `src/data/schedule.json` contém horários transcritos de uma tabela ferroviária de terceiros; confirme as condições da fonte original antes de reutilizar ou redistribuir esses dados.
