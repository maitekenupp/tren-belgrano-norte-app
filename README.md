# Andén — Belgrano Norte

App web para escolher uma estação e o sentido do trem no ramal Belgrano Norte, entre Retiro e Villa Rosa.

## Requisitos

- Node.js 18 ou superior

O projeto não tem dependências externas. Não é necessário executar `npm install`.

## Rodar no computador

1. Abra a pasta `tren-belgrano-norte-app` no Visual Studio Code.
2. Abra o terminal integrado do VS Code.
3. Execute:

   ```bash
   npm run dev
   ```

4. Acesse [http://localhost:4173](http://localhost:4173).
5. Para encerrar o servidor, pressione `Ctrl+C` no terminal.

Você também pode iniciar com `npm start`.

## Estrutura

```text
tren-belgrano-norte-app/
├── .vscode/
│   └── settings.json
├── src/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── index.html
├── .gitignore
├── package.json
├── README.md
└── server.js
```

- `src/index.html`: estrutura e conteúdo da página.
- `src/css/styles.css`: estilos e layout responsivo.
- `src/js/app.js`: lista das estações, busca e seleção de sentido.
- `server.js`: servidor local feito com módulos nativos do Node.js.

O app direciona para o tablero de próximos trens e para o horário publicado pela Ferrovías. Os horários em tempo real ainda são consultados na página da operadora; este projeto não inventa previsões quando a fonte não está acessível.

## Criar o repositório privado no GitHub

Instale e autentique o GitHub CLI (`gh`) antes de executar estes comandos. No PowerShell, a partir da pasta do projeto:

```powershell
git init -b main
git add .
git commit -m "Initial commit"
gh repo create tren-belgrano-norte-app --private --source=. --remote=origin --push
```

O parâmetro `--private` cria o repositório privado. O último comando configura `origin` e envia o commit inicial.
