import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as http from "http";
import { startNextServer } from "./nextServer";
import { SyncEngine } from "./sync";
import { LocalDB } from "./db";

let mainWindow: BrowserWindow | null = null;
let syncEngine: SyncEngine | null = null;

const PORT = 3721;

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
    titleBarStyle: "hiddenInset",
    title: "Norte Tecnologia ERP",
    icon: path.join(__dirname, "../public/icon-512.png"),
    show: false,
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  const db = new LocalDB();
  await db.init();

  syncEngine = new SyncEngine(db);

  await startNextServer(PORT);
  await createWindow();

  // Auto-updater
  autoUpdater.checkForUpdatesAndNotify();

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
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
