import * as fs from "fs";
import * as path from "path";
import { LocalDB, BackupConfig } from "./db";

export class BackupEngine {
  private db: LocalDB;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(db: LocalDB) {
    this.db = db;
    this.scheduleIfEnabled();
  }

  private scheduleIfEnabled() {
    const config = this.db.getBackupConfig();
    if (!config.enabled || !config.path) return;

    if (this.timer) clearInterval(this.timer);
    const ms = config.intervalHours * 60 * 60 * 1000;
    this.timer = setInterval(() => this.runNow(), ms);
  }

  async runNow(): Promise<{ success: boolean; path?: string; error?: string }> {
    const config = this.db.getBackupConfig();
    if (!config.path) {
      return { success: false, error: "Pasta de backup não configurada." };
    }

    try {
      if (!fs.existsSync(config.path)) {
        fs.mkdirSync(config.path, { recursive: true });
      }

      const dbPath = this.db.getDbPath();
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const destName = `erp-backup-${ts}.db`;
      const destPath = path.join(config.path, destName);

      fs.copyFileSync(dbPath, destPath);

      this.pruneOld(config);

      return { success: true, path: destPath };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  }

  private pruneOld(config: BackupConfig) {
    try {
      const files = fs.readdirSync(config.path)
        .filter(f => f.startsWith("erp-backup-") && f.endsWith(".db"))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(config.path, f)).mtime }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      const toDelete = files.slice(config.keepLast);
      for (const f of toDelete) {
        fs.unlinkSync(path.join(config.path, f.name));
      }
    } catch { /* non-fatal */ }
  }

  updateConfig(config: BackupConfig) {
    this.db.setBackupConfig(config);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.scheduleIfEnabled();
  }
}
