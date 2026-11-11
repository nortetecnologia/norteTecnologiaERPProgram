import * as fs from "fs";
import * as path from "path";

const userDataPath = process.env.USER_DATA_PATH ?? "";
const MAX_AGE_MS = 3 * 60 * 1000; // 3 minutos — dados locais são considerados frescos

export function isOfflineMode(): boolean {
  if (!userDataPath) return false;
  try {
    return fs.existsSync(path.join(userDataPath, ".offline"));
  } catch {
    return false;
  }
}

function getOfflineDataPath(): string {
  return path.join(userDataPath, "offline_data.json");
}

function getOfflineDataAge(): number {
  try {
    const stat = fs.statSync(getOfflineDataPath());
    return Date.now() - stat.mtimeMs;
  } catch {
    return Infinity;
  }
}

// Retorna true se existe dado local recente (< MAX_AGE_MS) OU se está em modo offline
export function shouldUseLocalData(): boolean {
  if (!userDataPath) return false;
  if (isOfflineMode()) return true;
  try {
    if (!fs.existsSync(getOfflineDataPath())) return false;
    return getOfflineDataAge() < MAX_AGE_MS;
  } catch {
    return false;
  }
}

// Chamada após qualquer mutation — força próxima leitura ir ao Supabase
export function markLocalDataStale() {
  try {
    const file = getOfflineDataPath();
    if (fs.existsSync(file)) {
      // Reseta mtime para epoch 0 → shouldUseLocalData() retorna false
      fs.utimesSync(file, new Date(0), new Date(0));
    }
  } catch {}
}

export function readOfflineData(): Record<string, unknown[]> {
  if (!userDataPath) return {};
  try {
    const file = getOfflineDataPath();
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.tables ?? {};
  } catch {
    return {};
  }
}
