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

// Tabelas do ERP — adicione conforme o schema do seu projeto Supabase
const ERP_TABLES = [
  "produtos",
  "categorias",
  "clientes",
  "vendas",
  "itens_venda",
  "fornecedores",
  "estoque",
  "formas_pagamento",
  "usuarios",
];

export async function dumpSupabase(destPath: string): Promise<DumpResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return { success: false, error: "Credenciais do Supabase não encontradas em .env.local" };
  }

  const supabase = createClient(url, key);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dump: Record<string, unknown[]> = {};
  const exported: string[] = [];
  let totalRows = 0;

  for (const table of ERP_TABLES) {
    try {
      // Busca em páginas de 1000 linhas para tabelas grandes
      let page = 0;
      const rows: unknown[] = [];
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) {
          // 42P01 = tabela não existe neste projeto — ignora
          if (error.code !== "42P01") {
            console.warn(`[dump] ${table}: ${error.message}`);
          }
          break;
        }
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
        page++;
      }
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
    return { success: false, error: "Nenhuma tabela encontrada. Verifique se os nomes das tabelas estão corretos." };
  }

  const outFile = path.join(destPath, `dump-supabase-${timestamp}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify({ exportedAt: new Date().toISOString(), tables: dump }, null, 2),
    "utf-8"
  );

  return { success: true, path: outFile, tables: exported, totalRows };
}
