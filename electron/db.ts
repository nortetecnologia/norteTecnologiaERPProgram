import * as path from "path";
import * as fs from "fs";
import { app } from "electron";

export interface BackupConfig {
  enabled: boolean;
  intervalHours: number;
  path: string;
  keepLast: number;
}

export interface PendingOperation {
  id: string;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  record_id: string;
  payload: string; // JSON string
  created_at: string;
  attempts: number;
}

export interface OfflineSale {
  id: string;
  customer_id?: string;
  subtotal: number;
  discount: number;
  total: number;
  items: string; // JSON string
  payments: string; // JSON string
  created_at: string;
  synced: boolean;
}

interface DBStore {
  config: Record<string, string>;
  pending_ops: PendingOperation[];
  products_cache: Record<string, Record<string, unknown>>;
  offline_sales: OfflineSale[];
}

export class LocalDB {
  private dataDir!: string;
  private store!: DBStore;
  private dbPath!: string;

  async init() {
    this.dataDir = app.getPath("userData");
    this.dbPath = path.join(this.dataDir, "erp-data.json");
    this.load();
  }

  getDbPath() { return this.dbPath; }

  private load() {
    try {
      if (fs.existsSync(this.dbPath)) {
        this.store = JSON.parse(fs.readFileSync(this.dbPath, "utf-8"));
      } else {
        this.store = { config: {}, pending_ops: [], products_cache: {}, offline_sales: [] };
      }
    } catch {
      this.store = { config: {}, pending_ops: [], products_cache: {}, offline_sales: [] };
    }
  }

  private save() {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.store, null, 2), "utf-8");
  }

  // Config
  getConfig(key: string): string | null {
    return this.store.config[key] ?? null;
  }

  setConfig(key: string, value: string) {
    this.store.config[key] = value;
    this.save();
  }

  getBackupConfig(): BackupConfig {
    const raw = this.getConfig("backup_config");
    if (raw) return JSON.parse(raw);
    return { enabled: false, intervalHours: 24, path: "", keepLast: 7 };
  }

  setBackupConfig(config: BackupConfig) {
    this.setConfig("backup_config", JSON.stringify(config));
  }

  // Pending operations
  addPendingOp(op: Omit<PendingOperation, "id" | "created_at" | "attempts">) {
    this.store.pending_ops.push({
      ...op,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      attempts: 0,
    });
    this.save();
  }

  getPendingOps(): PendingOperation[] {
    return this.store.pending_ops;
  }

  deletePendingOp(id: string) {
    this.store.pending_ops = this.store.pending_ops.filter(o => o.id !== id);
    this.save();
  }

  incrementAttempts(id: string) {
    const op = this.store.pending_ops.find(o => o.id === id);
    if (op) { op.attempts++; this.save(); }
  }

  getPendingCount(): number {
    return this.store.pending_ops.length;
  }

  // Products cache
  upsertProduct(p: Record<string, unknown>) {
    this.store.products_cache[p.id as string] = p;
    this.save();
  }

  getProducts(): unknown[] {
    return Object.values(this.store.products_cache).filter(p => (p as Record<string,unknown>).is_active);
  }

  updateStock(productId: string, delta: number) {
    const p = this.store.products_cache[productId];
    if (p) {
      (p as Record<string, unknown>).stock = ((p.stock as number) ?? 0) + delta;
      this.save();
    }
  }

  // Offline sales
  addOfflineSale(sale: Omit<OfflineSale, "created_at" | "synced">) {
    this.store.offline_sales.push({
      ...sale,
      created_at: new Date().toISOString(),
      synced: false,
    });
    this.save();
  }

  getUnsyncedSales(): OfflineSale[] {
    return this.store.offline_sales.filter(s => !s.synced);
  }

  markSaleSynced(id: string) {
    const s = this.store.offline_sales.find(s => s.id === id);
    if (s) { s.synced = true; this.save(); }
  }
}
