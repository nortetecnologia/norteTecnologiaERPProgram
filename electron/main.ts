import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as fs from "fs";
import { startNextServer, stopNextServer } from "./nextServer";
import { SyncEngine } from "./sync";
import { LocalDB } from "./db";

let mainWindow: BrowserWindow | null = null;
let syncEngine: SyncEngine | null = null;

const PORT = 3721;

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

function getLoadingPage(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "loading.html")
    : path.join(__dirname, "loading.html");
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
    show: true,
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
  });

  // F12 abre DevTools para debug
  mainWindow.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "F12") mainWindow?.webContents.openDevTools();
  });

  // Mostra tela de loading enquanto o servidor sobe
  mainWindow.loadFile(getLoadingPage());
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  // Remove menu nativo (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  loadEnvFromResources();

  const db = new LocalDB();
  await db.init();

  // Janela primeiro com tela de loading
  await createWindow();

  // SyncEngine inicializa depois (pode falhar se credenciais ausentes)
  const userDataPath = app.getPath("userData");
  try {
    syncEngine = new SyncEngine(db, userDataPath);
    // Sync completo imediatamente ao abrir o programa
    setTimeout(() => syncEngine?.syncNow(), 3000);
  } catch (err) {
    console.error("[sync] falha ao inicializar SyncEngine:", err);
  }

  try {
    await startNextServer(PORT);
    // Navega para o app quando o servidor estiver pronto
    mainWindow?.loadURL(`http://localhost:${PORT}`);
  } catch (err) {
    dialog.showErrorBox(
      "Erro ao iniciar o servidor",
      `O servidor interno não pôde ser iniciado:\n\n${err}\n\nVerifique se as variáveis de ambiente estão configuradas em .env.local`
    );
  }

  // Auto-updater
  setupAutoUpdater();

  // Sync IPC handlers
  ipcMain.handle("sync:getStatus", () => syncEngine?.getStatus());
  ipcMain.handle("sync:toggle", (_e, enabled: boolean) => syncEngine?.setEnabled(enabled));
  ipcMain.handle("sync:now", () => syncEngine?.syncNow());
  ipcMain.handle("sync:pull", () => syncEngine?.pullNow());
  ipcMain.handle("sync:push", () => syncEngine?.pushNow());
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

  // Dump completo do Supabase
  ipcMain.handle("dump:choosePath", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openDirectory"],
      title: "Escolha onde salvar o dump do Supabase",
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("dump:run", async (_e, destPath: string) => {
    const { dumpSupabase } = await import("./dump");
    return dumpSupabase(destPath);
  });
  ipcMain.handle("dump:chooseFile", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openFile"],
      title: "Escolha o arquivo de dump para restaurar",
      filters: [{ name: "Dump JSON", extensions: ["json"] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("dump:restore", async (_e, filePath: string) => {
    const { restoreFromDump } = await import("./dump");
    return restoreFromDump(filePath);
  });

  // Offline mode
  const offlineFlag = path.join(userDataPath, ".offline");

  ipcMain.handle("offline:status", () => fs.existsSync(offlineFlag));

  ipcMain.handle("offline:go", async () => {
    try {
      const { dumpForOffline } = await import("./dump");
      const result = await dumpForOffline(userDataPath);
      if (!result.success) return result;
      fs.writeFileSync(offlineFlag, new Date().toISOString(), "utf-8");
      return { success: true, tables: result.tables, totalRows: result.totalRows };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("offline:back", async () => {
    if (fs.existsSync(offlineFlag)) fs.unlinkSync(offlineFlag);
    // Dispara sync imediatamente: drena as escritas feitas offline e puxa o estado atualizado
    const result = await syncEngine?.syncNow();
    return { success: true, synced: result?.success ?? false, syncError: result?.error };
  });
});

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-downloaded", (info) => {
    if (!mainWindow) return;
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Atualização disponível",
      message: `Versão ${info.version} baixada. Reiniciar agora para aplicar?`,
      buttons: ["Reiniciar agora", "Depois"],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(false, true);
    });
  });

  autoUpdater.on("error", (err) => {
    console.error("[updater]", err.message);
  });

  try {
    autoUpdater.checkForUpdates();
  } catch {
    /* offline ou app portátil */
  }
}

app.on("window-all-closed", () => {
  stopNextServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
