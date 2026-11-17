import * as fs from "fs";
import * as path from "path";

const userDataPath = process.env.USER_DATA_PATH ?? "";
const MAX_AGE_MS = 3 * 60 * 1000; // 3 minutos — dados locais são considerados frescos
const FS_CACHE_TTL = 2_000; // re-verifica disco a cada 2s no máximo

function getOfflineDataPath(): string {
  return path.join(userDataPath, "offline_data.json");
}

// ── Cache em memória para evitar fs.existsSync / fs.statSync / JSON.parse repetidos ──

let _offlineFlagCache: { value: boolean; ts: number } | null = null;
let _offlineDataCache: { value: Record<string, unknown[]>; ts: number } | null = null;
let _shouldUseCache: { value: boolean; ts: number } | null = null;

export function isOfflineMode(): boolean {
  if (!userDataPath) return false;
  const now = Date.now();
  if (_offlineFlagCache && now - _offlineFlagCache.ts < FS_CACHE_TTL) {
    return _offlineFlagCache.value;
  }
  try {
    const value = fs.existsSync(path.join(userDataPath, ".offline"));
    _offlineFlagCache = { value, ts: now };
    return value;
  } catch {
    return false;
  }
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
  const now = Date.now();
  if (_shouldUseCache && now - _shouldUseCache.ts < FS_CACHE_TTL) {
    return _shouldUseCache.value;
  }
  let value = false;
  if (isOfflineMode()) {
    value = true;
  } else {
    try {
      if (fs.existsSync(getOfflineDataPath())) {
        value = getOfflineDataAge() < MAX_AGE_MS;
      }
    } catch {}
  }
  _shouldUseCache = { value, ts: now };
  return value;
}

// Chamada após qualquer mutation — força próxima leitura ir ao Supabase
export function markLocalDataStale() {
  _offlineDataCache = null;
  _shouldUseCache = null;
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
  const now = Date.now();
  if (_offlineDataCache && now - _offlineDataCache.ts < FS_CACHE_TTL) {
    return _offlineDataCache.value;
  }
  try {
    const file = getOfflineDataPath();
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    const value: Record<string, unknown[]> = parsed.tables ?? {};
    _offlineDataCache = { value, ts: now };
    return value;
  } catch {
    return {};
  }
}
