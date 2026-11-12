import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const userDataPath = process.env.USER_DATA_PATH ?? "";

type Op = "INSERT" | "UPDATE" | "DELETE";

interface PendingOp {
  id: string;
  table: string;
  operation: Op;
  record_id: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

function queuePath() { return path.join(userDataPath, "pending_ops.json"); }
function dataPath() { return path.join(userDataPath, "offline_data.json"); }

function atomicWrite(file: string, content: string) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, content, "utf-8");
  fs.renameSync(tmp, file);
}

function readQueue(): PendingOp[] {
  try {
    const raw = fs.readFileSync(queuePath(), "utf-8");
    return JSON.parse(raw).ops ?? [];
  } catch { return []; }
}

function appendOp(op: PendingOp) {
  const ops = readQueue();
  ops.push(op);
  atomicWrite(queuePath(), JSON.stringify({ ops }, null, 2));
}

function readData(): { tables: Record<string, Record<string, unknown>[]> } {
  try {
    const raw = fs.readFileSync(dataPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return { tables: parsed.tables ?? {} };
  } catch { return { tables: {} }; }
}

function writeData(tables: Record<string, Record<string, unknown>[]>) {
  atomicWrite(dataPath(), JSON.stringify({ exportedAt: new Date().toISOString(), tables }, null, 2));
}

// Aplica a operação no offline_data.json local para que a leitura reflita na hora
function applyToLocal(table: string, operation: Op, recordId: string, payload: Record<string, unknown> | null) {
  const data = readData();
  const rows = data.tables[table] ?? [];
  if (operation === "INSERT") {
    rows.push(payload as Record<string, unknown>);
    data.tables[table] = rows;
  } else if (operation === "UPDATE") {
    const idx = rows.findIndex((r) => r.id === recordId);
    if (idx >= 0) rows[idx] = { ...rows[idx], ...payload };
    data.tables[table] = rows;
  } else if (operation === "DELETE") {
    data.tables[table] = rows.filter((r) => r.id !== recordId);
  }
  writeData(data.tables);
}

// INSERT offline — gera UUID, grava local e enfileira. Retorna o id gerado.
// syncOmit: campos que ficam no registro local mas NÃO vão para o Supabase
// (ex.: sale_number temporário, que o Supabase gera via SERIAL no sync).
export function offlineInsert(table: string, payload: Record<string, unknown>, syncOmit: string[] = []): string {
  const id = (payload.id as string) || randomUUID();
  const now = new Date().toISOString();
  const record = { ...payload, id, created_at: (payload.created_at as string) || now };
  applyToLocal(table, "INSERT", id, record);
  const syncPayload: Record<string, unknown> = { ...record };
  for (const k of syncOmit) delete syncPayload[k];
  appendOp({ id: randomUUID(), table, operation: "INSERT", record_id: id, payload: syncPayload, created_at: now });
  return id;
}

export function offlineUpdate(table: string, recordId: string, payload: Record<string, unknown>) {
  applyToLocal(table, "UPDATE", recordId, payload);
  appendOp({ id: randomUUID(), table, operation: "UPDATE", record_id: recordId, payload, created_at: new Date().toISOString() });
}

export function offlineDelete(table: string, recordId: string) {
  applyToLocal(table, "DELETE", recordId, null);
  appendOp({ id: randomUUID(), table, operation: "DELETE", record_id: recordId, payload: null, created_at: new Date().toISOString() });
}

// Lê o estoque atual de um produto a partir do cache local (para baixa offline)
export function getLocalProductStock(productId: string): number | null {
  const data = readData();
  const products = data.tables["products"] ?? [];
  const p = products.find((r) => r.id === productId);
  return p ? ((p.stock as number) ?? 0) : null;
}
