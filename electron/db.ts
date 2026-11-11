import Database from "better-sqlite3";
import * as path from "path";
import { app } from "electron";
import * as fs from "fs";

export interface BackupConfig {
  enabled: boolean;
  intervalHours: number;
  path: string;
  keepLast: number;
}

export interface PendingOperation {
  id: number;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  record_id: string;
  payload: string; // JSON
  created_at: string;
  attempts: number;
}

export class LocalDB {
  private db!: Database.Database;
  private dbPath!: string;

  async init() {
    const userDataPath = app.getPath("userData");
    this.dbPath = path.join(userDataPath, "erp-local.db");
    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.createSchema();
  }

  getDbPath() { return this.dbPath; }

  private createSchema() {
    this.db.exec(`
      -- Fila de operações pendentes (offline)
      CREATE TABLE IF NOT EXISTS pending_operations (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name  TEXT    NOT NULL,
        operation   TEXT    NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
        record_id   TEXT    NOT NULL,
        payload     TEXT    NOT NULL,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        attempts    INTEGER NOT NULL DEFAULT 0
      );

      -- Configurações do app desktop
      CREATE TABLE IF NOT EXISTS desktop_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      -- Cache local de produtos
      CREATE TABLE IF NOT EXISTS products_cache (
        id           TEXT PRIMARY KEY,
        name         TEXT,
        sku          TEXT,
        price        REAL,
        stock        INTEGER DEFAULT 0,
        is_active    INTEGER DEFAULT 1,
        category_id  TEXT,
        description  TEXT,
        updated_at   TEXT,
        synced_at    TEXT DEFAULT (datetime('now'))
      );

      -- Cache local de clientes
      CREATE TABLE IF NOT EXISTS customers_cache (
        id         TEXT PRIMARY KEY,
        name       TEXT,
        phone      TEXT,
        email      TEXT,
        cpf_cnpj   TEXT,
        updated_at TEXT,
        synced_at  TEXT DEFAULT (datetime('now'))
      );

      -- Vendas criadas offline
      CREATE TABLE IF NOT EXISTS offline_sales (
        id          TEXT PRIMARY KEY,
        sale_number TEXT,
        customer_id TEXT,
        subtotal    REAL,
        discount    REAL DEFAULT 0,
        total       REAL,
        items       TEXT NOT NULL, -- JSON
        payments    TEXT NOT NULL, -- JSON
        created_at  TEXT DEFAULT (datetime('now')),
        synced      INTEGER DEFAULT 0
      );
    `);
  }

  // Config
  getConfig(key: string): string | null {
    const row = this.db.prepare("SELECT value FROM desktop_config WHERE key = ?").get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setConfig(key: string, value: string) {
    this.db.prepare("INSERT OR REPLACE INTO desktop_config (key, value) VALUES (?, ?)").run(key, value);
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
    this.db.prepare(
      "INSERT INTO pending_operations (table_name, operation, record_id, payload) VALUES (?,?,?,?)"
    ).run(op.table_name, op.operation, op.record_id, op.payload);
  }

  getPendingOps(): PendingOperation[] {
    return this.db.prepare("SELECT * FROM pending_operations ORDER BY id ASC").all() as PendingOperation[];
  }

  deletePendingOp(id: number) {
    this.db.prepare("DELETE FROM pending_operations WHERE id = ?").run(id);
  }

  incrementAttempts(id: number) {
    this.db.prepare("UPDATE pending_operations SET attempts = attempts + 1 WHERE id = ?").run(id);
  }

  getPendingCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM pending_operations").get() as { cnt: number };
    return row.cnt;
  }

  // Products cache
  upsertProduct(p: Record<string, unknown>) {
    this.db.prepare(`
      INSERT OR REPLACE INTO products_cache
        (id, name, sku, price, stock, is_active, category_id, description, updated_at)
      VALUES (@id, @name, @sku, @price, @stock, @is_active, @category_id, @description, @updated_at)
    `).run(p);
  }

  getProducts(): unknown[] {
    return this.db.prepare("SELECT * FROM products_cache WHERE is_active = 1 ORDER BY name").all();
  }

  updateStock(productId: string, delta: number) {
    this.db.prepare("UPDATE products_cache SET stock = stock + ? WHERE id = ?").run(delta, productId);
  }

  // Offline sales
  addOfflineSale(sale: Record<string, unknown>) {
    this.db.prepare(`
      INSERT INTO offline_sales (id, customer_id, subtotal, discount, total, items, payments)
      VALUES (@id, @customer_id, @subtotal, @discount, @total, @items, @payments)
    `).run(sale);
  }

  getUnsyncedSales(): unknown[] {
    return this.db.prepare("SELECT * FROM offline_sales WHERE synced = 0").all();
  }

  markSaleSynced(id: string) {
    this.db.prepare("UPDATE offline_sales SET synced = 1 WHERE id = ?").run(id);
  }

  getRaw() { return this.db; }
}
