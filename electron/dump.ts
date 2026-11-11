import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

export interface DumpResult {
  success: boolean;
  path?: string;
  tables?: string[];
  totalRows?: number;
  error?: string;
}

// Tabelas reais do projeto (nomes no Supabase)
const ERP_TABLES = [
  "products",
  "product_images",
  "categories",
  "erp_customers",
  "erp_pdv_sales",
  "erp_pdv_sale_items",
  "erp_service_orders",
  "erp_service_order_items",
  "erp_stock_movements",
  "erp_pdv_sale_payments",
  "payment_methods",
  "store_settings",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(supabase: any, table: string) {
  const rows: unknown[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error) {
      if (error.code !== "42P01") console.warn(`[dump] ${table}: ${error.message}`);
      break;
    }
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
    page++;
  }
  return rows;
}

export async function dumpSupabase(destPath: string): Promise<DumpResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return { success: false, error: "Credenciais do Supabase não encontradas em .env.local" };
  }

  const supabase = createClient(url, key);
  const dump: Record<string, unknown[]> = {};
  const exported: string[] = [];
  let totalRows = 0;

  for (const table of ERP_TABLES) {
    try {
      const rows = await fetchAll(supabase, table);
      if (rows.length > 0) {
        dump[table] = rows;
        exported.push(table);
        totalRows += rows.length;
      }
    } catch (e) {
      console.warn(`[dump] erro em ${table}:`, e);
    }
  }

  if (exported.length === 0) {
    return { success: false, error: "Nenhuma tabela encontrada. Verifique credenciais e nomes de tabela." };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outFile = path.join(destPath, `dump-supabase-${timestamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ exportedAt: new Date().toISOString(), tables: dump }, null, 2), "utf-8");

  return { success: true, path: outFile, tables: exported, totalRows };
}

export interface RestoreResult {
  success: boolean;
  tables?: string[];
  totalRows?: number;
  error?: string;
}

// Ordem de inserção respeitando FKs
const RESTORE_ORDER = [
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

export async function restoreFromDump(dumpFilePath: string): Promise<RestoreResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return { success: false, error: "Credenciais do Supabase não encontradas em .env.local" };
  }

  let raw: string;
  try {
    raw = fs.readFileSync(dumpFilePath, "utf-8");
  } catch (e: any) {
    return { success: false, error: `Não foi possível ler o arquivo: ${e.message}` };
  }

  let dumpData: { tables: Record<string, unknown[]> };
  try {
    dumpData = JSON.parse(raw);
  } catch {
    return { success: false, error: "Arquivo inválido — não é um JSON de dump válido." };
  }

  if (!dumpData.tables) {
    return { success: false, error: "Formato inválido — campo 'tables' não encontrado." };
  }

  const supabase = createClient(url, key);
  const restored: string[] = [];
  let totalRows = 0;

  for (const table of RESTORE_ORDER) {
    const rows = dumpData.tables[table];
    if (!rows || rows.length === 0) continue;
    try {
      // Upsert em lotes de 500 para evitar timeout
      const BATCH = 500;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await supabase.from(table).upsert(batch as any, { onConflict: "id" });
        if (error) {
          console.warn(`[restore] ${table} lote ${i}: ${error.message}`);
        }
      }
      restored.push(table);
      totalRows += rows.length;
    } catch (e) {
      console.warn(`[restore] erro em ${table}:`, e);
    }
  }

  return { success: true, tables: restored, totalRows };
}

// Dump específico para offline mode — salva em userData/offline_data.json
export async function dumpForOffline(userDataPath: string): Promise<DumpResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return { success: false, error: "Credenciais não encontradas" };
  }

  const supabase = createClient(url, key);
  const tables: Record<string, unknown[]> = {};
  const exported: string[] = [];
  let totalRows = 0;

  for (const table of ERP_TABLES) {
    try {
      const rows = await fetchAll(supabase, table);
      tables[table] = rows;
      if (rows.length > 0) { exported.push(table); totalRows += rows.length; }
    } catch (e) {
      console.warn(`[offline-dump] ${table}:`, e);
      tables[table] = [];
    }
  }

  const outFile = path.join(userDataPath, "offline_data.json");
  fs.writeFileSync(outFile, JSON.stringify({ exportedAt: new Date().toISOString(), tables }, null, 2), "utf-8");

  return { success: true, path: outFile, tables: exported, totalRows };
}
