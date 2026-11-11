export interface SyncStatus {
  enabled: boolean;
  online: boolean;
  lastSync: string | null;
  pendingCount: number;
  syncing: boolean;
}

export interface BackupConfigData {
  enabled: boolean;
  intervalHours: number;
  path: string;
  keepLast: number;
}

export interface DumpResult {
  success: boolean;
  path?: string;
  tables?: string[];
  totalRows?: number;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  tables?: string[];
  totalRows?: number;
  error?: string;
}

export interface ElectronAPI {
  getSyncStatus: () => Promise<SyncStatus>;
  toggleSync: (enabled: boolean) => Promise<void>;
  syncNow: () => Promise<{ success: boolean; error?: string }>;
  getPendingCount: () => Promise<number>;
  onSyncUpdate: (cb: (status: SyncStatus) => void) => () => void;
  getBackupConfig: () => Promise<BackupConfigData>;
  setBackupConfig: (config: BackupConfigData) => Promise<void>;
  backupNow: () => Promise<{ success: boolean; path?: string; error?: string }>;
  chooseBackupPath: () => Promise<string | null>;
  dumpChoosePath: () => Promise<string | null>;
  dumpRun: (destPath: string) => Promise<DumpResult>;
  dumpChooseFile: () => Promise<string | null>;
  dumpRestore: (filePath: string) => Promise<RestoreResult>;
  offlineStatus: () => Promise<boolean>;
  offlineGo: () => Promise<{ success: boolean; tables?: string[]; totalRows?: number; error?: string }>;
  offlineBack: () => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
