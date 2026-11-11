import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { BrowserWindow } from "electron";
import { LocalDB } from "./db";

export interface SyncStatus {
  enabled: boolean;
  online: boolean;
  lastSync: string | null;
  pendingCount: number;
  syncing: boolean;
}

export class SyncEngine {
  private db: LocalDB;
  private supabase: SupabaseClient;
  private enabled: boolean;
  private syncing = false;
  private lastSync: string | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor(db: LocalDB) {
    this.db = db;
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
      online: false, // atualizado via isOnline()
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
    // Sync a cada 60 segundos quando enabled
    this.syncInterval = setInterval(() => this.syncNow(), 60_000);
  }

  async syncNow(): Promise<{ success: boolean; error?: string }> {
    if (this.syncing) return { success: false, error: "Sync já em andamento." };
    if (!this.enabled) return { success: false, error: "Sync desligado." };

    const online = await this.isOnline();
    if (!online) return { success: false, error: "Sem conexão com Supabase." };

    this.syncing = true;
    this.broadcast({ ...this.getStatus(), syncing: true, online: true });

    try {
      await this.pullFromSupabase();
      await this.drainQueue();
      this.lastSync = new Date().toISOString();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    } finally {
      this.syncing = false;
      this.broadcast({ ...this.getStatus(), syncing: false, online: true });
    }
  }

  private async pullFromSupabase() {
    // Puxa produtos do Supabase para cache local
    const { data: products } = await this.supabase
      .from("products")
      .select("id, name, sku, price, stock, is_active, category_id, description, updated_at");

    if (products) {
      for (const p of products) {
        this.db.upsertProduct({
          id: p.id,
          name: p.name,
          sku: p.sku ?? null,
          price: p.price,
          stock: p.stock ?? 0,
          is_active: p.is_active ? 1 : 0,
          category_id: p.category_id ?? null,
          description: p.description ?? null,
          updated_at: p.updated_at ?? null,
        });
      }
    }
  }

  private async drainQueue() {
    const ops = this.db.getPendingOps();
    for (const op of ops) {
      try {
        const payload = JSON.parse(op.payload);
        if (op.operation === "INSERT") {
          const { error } = await this.supabase.from(op.table_name).insert(payload);
          if (error) throw error;
        } else if (op.operation === "UPDATE") {
          const { error } = await this.supabase
            .from(op.table_name).update(payload).eq("id", op.record_id);
          if (error) throw error;
        } else if (op.operation === "DELETE") {
          const { error } = await this.supabase
            .from(op.table_name).delete().eq("id", op.record_id);
          if (error) throw error;
        }
        this.db.deletePendingOp(op.id);
      } catch {
        this.db.incrementAttempts(op.id);
      }
    }

    // Drena vendas offline
    const sales = this.db.getUnsyncedSales() as Array<Record<string, unknown>>;
    for (const sale of sales) {
      try {
        const items = JSON.parse(sale.items as string);
        const payments = JSON.parse(sale.payments as string);

        const { data: inserted, error } = await this.supabase
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

        await this.supabase.from("erp_pdv_sale_items").insert(
          items.map((i: Record<string, unknown>) => ({ ...i, sale_id: inserted.id }))
        );
        await this.supabase.from("erp_pdv_sale_payments").insert(
          payments.map((p: Record<string, unknown>) => ({ ...p, sale_id: inserted.id }))
        );

        // Aplica delta de estoque — pode ir negativo (comportamento desejado)
        for (const item of items as Array<{ product_id: string; quantity: number }>) {
          if (!item.product_id) continue;
          await this.supabase.rpc("decrement_stock", {
            p_product_id: item.product_id,
            p_qty: item.quantity,
          });
        }

        this.db.markSaleSynced(sale.id as string);
      } catch { /* tenta no próximo ciclo */ }
    }
  }
}
