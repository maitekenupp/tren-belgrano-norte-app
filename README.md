# Andén — Belgrano Norte

App web para escolher uma das 23 estações e o sentido do trem no ramal Belgrano Norte, entre Retiro e Villa Rosa. Calcula os próximos horários programados comparando a tabela local com o relógio do dispositivo.

## Requisitos

- Node.js 18 ou superior

O app não tem dependências externas. Não é necessário executar `npm install`.

## Rodar no computador

1. Abra a pasta `tren-belgrano-norte-app` no Visual Studio Code.
2. Abra o terminal integrado do VS Code.
3. Execute:

   ```bash
   npm run dev
   ```

4. Acesse [http://localhost:4173](http://localhost:4173).
5. Para encerrar o servidor, pressione `Ctrl+C` no terminal.

Você também pode iniciar com `npm start`. Se a porta 4173 já estiver ocupada, escolha outra no PowerShell:

```powershell
$env:PORT = 4174
npm run dev
```

Depois abra `http://localhost:4174`.

## Estrutura

```text
tren-belgrano-norte-app/
├── .vscode/
│   └── settings.json
├── scripts/
│   └── import_schedule.py
├── src/
│   ├── css/
│   │   └── styles.css
│   ├── data/
│   │   └── schedule.json
│   ├── js/
│   │   └── app.js
│   └── index.html
├── .gitignore
├── package.json
├── README.md
├── requirements-import.txt
└── server.js
```

- `src/index.html`: estrutura e conteúdo da página.
- `src/css/styles.css`: estilos e layout responsivo.
- `src/js/app.js`: busca da estação, sentido, dia de serviço e cálculo dos próximos horários.
- `src/data/schedule.json`: horários por estação, dia e sentido.
- `server.js`: servidor local feito com módulos nativos do Node.js.
- `scripts/import_schedule.py`: extrator para gerar o JSON a partir do PDF de horários.

## Como o app escolhe os próximos trens

- Usa a hora e o fuso local do computador ou celular que abriu a página.
- A estação é escolhida em um menu suspenso; toque na estrela para salvar ou remover uma estação de **Favoritas**. Essa lista fica salva no navegador do dispositivo.
- Em modo automático, escolhe dias úteis, sábado ou domingo pelo calendário local.
- Em feriados que caem durante a semana, selecione manualmente **Domingo o feriado**. O app não consulta um calendário online.
- A lista mostra os próximos quatro horários da estação e do sentido escolhidos, incluindo minutos restantes.
- Os horários são os programados no **Horario N° 21**, vigente desde 19/05/2026. Não são posições do trem nem previsão de atraso em tempo real.

## Atualizar a tabela a partir de outro PDF

O app funciona apenas com `schedule.json`; Python só é necessário para importar uma nova tabela. Com Python instalado:

```powershell
python -m pip install -r requirements-import.txt
python scripts/import_schedule.py "..\horarios-tren-belgrano-norte.pdf"
```

O script lê as tabelas de dias úteis, sábados, domingos/feriados e os dois sentidos, e atualiza `src/data/schedule.json`.

## Criar o repositório privado no GitHub

Instale e autentique o GitHub CLI (`gh`) antes de executar estes comandos. No PowerShell, a partir da pasta do projeto:

```powershell
git init -b main
git add .
git commit -m "Initial commit"
gh repo create tren-belgrano-norte-app --private --source=. --remote=origin --push
```

O parâmetro `--private` cria o repositório privado. O último comando configura `origin` e envia o commit inicial.
