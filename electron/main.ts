import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as fs from "fs";
import { startNextServer, stopNextServer } from "./nextServer";
import { SyncEngine } from "./sync";
import { LocalDB } from "./db";

let mainWindow: BrowserWindow | null = null;
let syncEngine: SyncEngine | null = null;

const PORT = 3721;

// Carrega .env.local do diretório de recursos (para env vars de runtime)
function loadEnvFromResources() {
  const envPaths = app.isPackaged
    ? [
        path.join(process.resourcesPath, "app", ".env.local"),
        path.join(process.resourcesPath, ".env.local"),
      ]
    : [path.join(__dirname, "..", ".env.local")];

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
    break;
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "Norte Tecnologia ERP",
    icon: path.join(__dirname, "../public/icon-512.png"),
    show: true, // mostra imediatamente
    backgroundColor: "#0a0a0a",
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  loadEnvFromResources();

  const db = new LocalDB();
  await db.init();

  // Janela primeiro — sempre visível independente de erros de sync
  await createWindow();

  // SyncEngine inicializa depois (pode falhar se credenciais ausentes)
  try {
    syncEngine = new SyncEngine(db);
  } catch (err) {
    console.error("[sync] falha ao inicializar SyncEngine:", err);
  }

  try {
    await startNextServer(PORT);
    // Recarrega a página depois que o servidor está pronto
    mainWindow?.loadURL(`http://localhost:${PORT}`);
  } catch (err) {
    dialog.showErrorBox(
      "Erro ao iniciar o servidor",
      `O servidor interno não pôde ser iniciado:\n\n${err}\n\nVerifique se as variáveis de ambiente estão configuradas em .env.local`
    );
  }

  // Auto-updater (ignora erros de rede)
  try { autoUpdater.checkForUpdatesAndNotify(); } catch { /* offline */ }

  // Sync IPC handlers
  ipcMain.handle("sync:getStatus", () => syncEngine?.getStatus());
  ipcMain.handle("sync:toggle", (_e, enabled: boolean) => syncEngine?.setEnabled(enabled));
  ipcMain.handle("sync:now", () => syncEngine?.syncNow());
  ipcMain.handle("sync:getPendingCount", () => syncEngine?.getPendingCount());

  // Backup IPC handlers
  ipcMain.handle("backup:getConfig", () => db.getBackupConfig());
  ipcMain.handle("backup:setConfig", (_e, config) => db.setBackupConfig(config));
  ipcMain.handle("backup:now", async () => {
    const { BackupEngine } = await import("./backup");
    return new BackupEngine(db).runNow();
  });
  ipcMain.handle("backup:choosePath", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openDirectory"],
      title: "Escolha a pasta para backups",
    });
    return result.canceled ? null : result.filePaths[0];
  });
});

app.on("window-all-closed", () => {
  stopNextServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
