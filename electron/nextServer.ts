import { fork, ChildProcess } from "child_process";
import * as path from "path";
import * as http from "http";
import * as fs from "fs";
import { app } from "electron";

let serverProcess: ChildProcess | null = null;

function getServerJs(): string {
  if (app.isPackaged) {
    // Pasta resources/app/.next/standalone/server.js
    return path.join(process.resourcesPath, "app", ".next", "standalone", "server.js");
  }
  // Desenvolvimento: .next/standalone/server.js relativo à raiz do projeto
  return path.join(__dirname, "..", ".next", "standalone", "server.js");
}

export async function startNextServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverJs = getServerJs();

    if (!fs.existsSync(serverJs)) {
      return reject(
        new Error(
          `Servidor Next.js não encontrado em: ${serverJs}\n` +
          "Execute: ELECTRON_BUILD=true npm run build"
        )
      );
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
    };

    serverProcess = fork(serverJs, [], {
      env,
      silent: true,
    });

    serverProcess.stdout?.on("data", (d: Buffer) => {
      if (process.env.NODE_ENV !== "production") console.log("[next]", d.toString().trim());
    });
    serverProcess.stderr?.on("data", (d: Buffer) => console.error("[next:err]", d.toString().trim()));
    serverProcess.on("error", reject);

    // Aguarda o servidor aceitar conexões (qualquer resposta = servidor no ar)
    const start = Date.now();
    const poll = setInterval(() => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        res.resume(); // descarta o body
        clearInterval(poll);
        resolve(); // qualquer status code = servidor iniciou
      });
      req.on("error", () => {
        if (Date.now() - start > 45_000) {
          clearInterval(poll);
          reject(new Error("Timeout: Next.js não iniciou em 45s"));
        }
      });
      req.end();
    }, 500);
  });
}

export function stopNextServer() {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}
