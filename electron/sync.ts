import "./ws-polyfill";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { BrowserWindow } from "electron";
import * as fs from "fs";
import * as path from "path";
import { LocalDB } from "./db";

export interface SyncStatus {
  enabled: boolean;
  online: boolean;
  lastSync: string | null;
  pendingCount: number;
  syncing: boolean;
}

// Todas as tabelas ERP para espelhar localmente
const SYNC_TABLES = [
  "store_settings",
  "categories",
  "products",
  "product_images",
  "payment_methods",
  "erp_customers",
  "erp_pdv_sales",
  "erp_pdv_sale_items",
  "erp_pdv_sale_payments",
  "erp_service_orders",
  "erp_service_order_items",
  "erp_stock_movements",
];

export class SyncEngine {
  private db: LocalDB;
  private supabase: SupabaseClient;
  private enabled: boolean;
  private syncing = false;
  private lastSync: string | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private userDataPath: string;

  constructor(db: LocalDB, userDataPath: string) {
    this.db = db;
    this.userDataPath = userDataPath;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );
    this.enabled = db.getConfig("sync_enabled") !== "false";
    if (this.enabled) this.startInterval();
  }

  private broadcast(status: SyncStatus) {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send("sync:update", status)
    );
  }

  private async isOnline(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from("store_settings").select("id").limit(1);
      return !error;
    } catch { return false; }
  }

  getStatus(): SyncStatus {
    return {
      enabled: this.enabled,
      online: false,
      lastSync: this.lastSync,
      pendingCount: this.db.getPendingCount(),
      syncing: this.syncing,
    };
  }

  getPendingCount(): number { return this.db.getPendingCount(); }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.db.setConfig("sync_enabled", enabled ? "true" : "false");
    if (enabled) {
      this.startInterval();
      this.syncNow();
    } else if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private startInterval() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    // Sync completo a cada 2 minutos
    this.syncInterval = setInterval(() => this.syncNow(), 120_000);
  }

  private isOfflineFlagSet(): boolean {
    try {
      return fs.existsSync(path.join(this.userDataPath, ".offline"));
    } catch { return false; }
  }

  async syncNow(): Promise<{ success: boolean; error?: string }> {
    if (this.syncing) return { success: false, error: "Sync já em andamento." };
    if (!this.enabled) return { success: false, error: "Sync desligado." };
    // Enquanto o modo offline está ativo, o banco local é a fonte da verdade — não sincroniza
    if (this.isOfflineFlagSet()) return { success: false, error: "Modo offline ativo." };

    const online = await this.isOnline();
    if (!online) return { success: false, error: "Sem conexão com Supabase." };

    this.syncing = true;
    this.broadcast({ ...this.getStatus(), syncing: true, online: true });

    try {
      // Drena primeiro (empurra escritas locais para o Supabase), depois puxa o estado atualizado.
      // A ordem evita que o pull sobrescreva mudanças locais ainda não enviadas.
      await this.drainPendingOps();
      await this.drainQueue();
      await this.pullAllTables();
      this.lastSync = new Date().toISOString();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    } finally {
      this.syncing = false;
      this.broadcast({ ...this.getStatus(), syncing: false, online: true });
    }
  }

  // Drena pending_ops.json — a fila que as server actions do Next.js escrevem no modo offline
  private async drainPendingOps() {
    const file = path.join(this.userDataPath, "pending_ops.json");
    let ops: Array<Record<string, any>> = [];
    try {
      ops = JSON.parse(fs.readFileSync(file, "utf-8")).ops ?? [];
    } catch { return; }
    if (ops.length === 0) return;

    const processedIds = new Set<string>();
    const attemptsMap = new Map<string, number>();

    for (const op of ops) {
      try {
        if (op.operation === "INSERT") {
          const { error } = await (this.supabase as any).from(op.table).insert(op.payload);
          if (error) throw error;
        } else if (op.operation === "UPDATE") {
          const { error } = await (this.supabase as any).from(op.table).update(op.payload).eq("id", op.record_id);
          if (error) throw error;
        } else if (op.operation === "DELETE") {
          const { error } = await (this.supabase as any).from(op.table).delete().eq("id", op.record_id);
          if (error) throw error;
        }
        processedIds.add(op.id);
      } catch (e) {
        const attempts = (op.attempts ?? 0) + 1;
        attemptsMap.set(op.id, attempts);
        if (attempts > 5) {
          console.warn(`[sync] op ${op.table}/${op.operation} descartada após 5 tentativas:`, e);
          processedIds.add(op.id);
        } else {
          // Para no primeiro erro para preservar ordem/dependências (FK); tenta no próximo ciclo
          break;
        }
      }
    }

    // Re-lê a fila (pode ter novos appends concorrentes) e remove os processados
    try {
      const current: Array<Record<string, any>> = JSON.parse(fs.readFileSync(file, "utf-8")).ops ?? [];
      const remaining = current
        .filter((o) => !processedIds.has(o.id))
        .map((o) => (attemptsMap.has(o.id) ? { ...o, attempts: attemptsMap.get(o.id) } : o));
      const tmp = file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify({ ops: remaining }, null, 2), "utf-8");
      fs.renameSync(tmp, file);
    } catch { /* ignora */ }
  }

  // Sincroniza todas as tabelas ERP para o arquivo local offline_data.json
  private async pullAllTables() {
    const tables: Record<string, unknown[]> = {};

    for (const table of SYNC_TABLES) {
      try {
        const rows: unknown[] = [];
        let page = 0;
        while (true) {
          const { data, error } = await (this.supabase as any)
            .from(table)
            .select("*")
            .range(page * 1000, (page + 1) * 1000 - 1);
          if (error || !data) break;
          rows.push(...data);
          if (data.length < 1000) break;
          page++;
        }
        tables[table] = rows;
      } catch (e) {
        console.warn(`[sync] erro ao puxar ${table}:`, e);
      }
    }

    // Escrita atômica: escreve em .tmp e renomeia, evitando que uma leitura
    // concorrente pegue um JSON parcial durante o sync
    const outFile = path.join(this.userDataPath, "offline_data.json");
    const tmpFile = outFile + ".tmp";
    fs.writeFileSync(
      tmpFile,
      JSON.stringify({ exportedAt: new Date().toISOString(), tables }, null, 2),
      "utf-8"
    );
    fs.renameSync(tmpFile, outFile);

    // Mantém cache de produtos no LocalDB também (compatibilidade)
    const products = (tables["products"] ?? []) as Array<Record<string, unknown>>;
    for (const p of products) {
      this.db.upsertProduct(p);
    }
  }

  private async drainQueue() {
    const ops = this.db.getPendingOps();
    for (const op of ops) {
      try {
        const payload = JSON.parse(op.payload);
        if (op.operation === "INSERT") {
          const { error } = await (this.supabase as any).from(op.table_name).insert(payload);
          if (error) throw error;
        } else if (op.operation === "UPDATE") {
          const { error } = await (this.supabase as any)
            .from(op.table_name).update(payload).eq("id", op.record_id);
          if (error) throw error;
        } else if (op.operation === "DELETE") {
          const { error } = await (this.supabase as any)
            .from(op.table_name).delete().eq("id", op.record_id);
          if (error) throw error;
        }
        this.db.deletePendingOp(op.id);
      } catch {
        this.db.incrementAttempts(op.id);
      }
    }

    // Drena vendas offline
    const sales = this.db.getUnsyncedSales() as unknown as Array<Record<string, unknown>>;
    for (const sale of sales) {
      try {
        const items = JSON.parse(sale.items as string);
        const payments = JSON.parse(sale.payments as string);

        const { data: inserted, error } = await (this.supabase as any)
          .from("erp_pdv_sales")
          .insert({
            id: sale.id,
            customer_id: sale.customer_id,
            subtotal: sale.subtotal,
            discount: sale.discount,
            total: sale.total,
          })
          .select("id, sale_number")
          .single();

        if (error) throw error;

        await (this.supabase as any).from("erp_pdv_sale_items").insert(
          items.map((i: Record<string, unknown>) => ({ ...i, sale_id: inserted.id }))
        );
        await (this.supabase as any).from("erp_pdv_sale_payments").insert(
          payments.map((p: Record<string, unknown>) => ({ ...p, sale_id: inserted.id }))
        );

        for (const item of items as Array<{ product_id: string; quantity: number }>) {
          if (!item.product_id) continue;
          await (this.supabase as any).rpc("decrement_stock", {
            p_product_id: item.product_id,
            p_qty: item.quantity,
          });
        }

        this.db.markSaleSynced(sale.id as string);
      } catch { /* tenta no próximo ciclo */ }
    }
  }
}
