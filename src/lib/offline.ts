import * as fs from "fs";
import * as path from "path";

const userDataPath = process.env.USER_DATA_PATH ?? "";

export function isOfflineMode(): boolean {
  if (!userDataPath) return false;
  try {
    return fs.existsSync(path.join(userDataPath, ".offline"));
  } catch {
    return false;
  }
}

export function readOfflineData(): Record<string, unknown[]> {
  if (!userDataPath) return {};
  try {
    const file = path.join(userDataPath, "offline_data.json");
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.tables ?? {};
  } catch {
    return {};
  }
}
