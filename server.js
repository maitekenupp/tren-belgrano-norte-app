const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "src");
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || "0.0.0.0";
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  if (pathname === "/") pathname = "/index.html";
  const filePath = path.resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(contents);
  });
});

server.listen(port, host, () => {
  if (host === "0.0.0.0") {
    console.log(`Andén local disponível em http://localhost:${port}`);
    const addresses = Object.values(os.networkInterfaces()).flatMap((items) => items || [])
      .filter((item) => item.family === "IPv4" && !item.internal)
      .map((item) => item.address);
    for (const address of addresses) console.log(`Celular na mesma Wi-Fi: http://${address}:${port}`);
  } else {
    console.log(`Andén local disponível em http://${host}:${port}`);
  }
  console.log("Pressione Ctrl+C para encerrar.");
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`A porta ${port} já está em uso. No PowerShell, tente: $env:PORT = 4174; npm run dev`);
  } else {
    console.error(`Não foi possível iniciar o servidor: ${error.message}`);
  }
  process.exitCode = 1;
});
