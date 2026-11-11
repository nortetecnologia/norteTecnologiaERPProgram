import { headers } from "next/headers";

const store = new Map<string, number[]>();
let lastCleanup = 0;

function runCleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, timestamps] of store.entries()) {
    if (timestamps.every((t) => t < cutoff)) store.delete(key);
  }
}

export async function getClientIP(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

export function slidingWindow(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  runCleanup(windowMs);
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (store.get(key) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= maxRequests) {
    store.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}
