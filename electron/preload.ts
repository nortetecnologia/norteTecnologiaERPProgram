import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Sync
  getSyncStatus: () => ipcRenderer.invoke("sync:getStatus"),
  toggleSync: (enabled: boolean) => ipcRenderer.invoke("sync:toggle", enabled),
  syncNow: () => ipcRenderer.invoke("sync:now"),
  getPendingCount: () => ipcRenderer.invoke("sync:getPendingCount"),
  onSyncUpdate: (cb: (status: unknown) => void) => {
    ipcRenderer.on("sync:update", (_e, s) => cb(s));
    return () => ipcRenderer.removeAllListeners("sync:update");
  },

  // Backup
  getBackupConfig: () => ipcRenderer.invoke("backup:getConfig"),
  setBackupConfig: (config: unknown) => ipcRenderer.invoke("backup:setConfig", config),
  backupNow: () => ipcRenderer.invoke("backup:now"),
  chooseBackupPath: () => ipcRenderer.invoke("backup:choosePath"),

  // Dump Supabase
  dumpChoosePath: () => ipcRenderer.invoke("dump:choosePath"),
  dumpRun: (destPath: string) => ipcRenderer.invoke("dump:run", destPath),
});
