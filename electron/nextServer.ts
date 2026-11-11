import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as http from "http";
import { app } from "electron";

let serverProcess: ChildProcess | null = null;

export async function startNextServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const appPath = app.isPackaged
      ? path.join(process.resourcesPath, "app")
      : path.join(__dirname, "..");

    const nextBin = path.join(appPath, "node_modules", ".bin", "next");
    const env = { ...process.env, PORT: String(port) };

    serverProcess = spawn(process.execPath, [nextBin, "start", "--port", String(port)], {
      cwd: appPath,
      env,
      stdio: "pipe",
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      if (process.env.NODE_ENV !== "production") {
        console.log("[next]", data.toString().trim());
      }
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      console.error("[next:err]", data.toString().trim());
    });

    serverProcess.on("error", reject);

    // Poll until Next.js is ready
    const start = Date.now();
    const poll = setInterval(() => {
      http.get(`http://localhost:${port}`, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          clearInterval(poll);
          resolve();
        }
      }).on("error", () => {
        if (Date.now() - start > 30_000) {
          clearInterval(poll);
          reject(new Error("Next.js server did not start in 30s"));
        }
      });
    }, 500);
  });
}

export function stopNextServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}
