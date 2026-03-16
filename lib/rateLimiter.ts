// Simple in-memory rate limiter — resets on server restart.
// Suitable for single-instance deployment. For multi-region, use Redis.

type Entry = { timestamps: number[] };
const store = new Map<string, Entry>();

export function isRateLimited(
  ip: string,
  maxRequests = 8,
  windowMs = 120_000,
): boolean {
  const now = Date.now();
  const entry = store.get(ip) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    store.set(ip, entry);
    return true;
  }

  entry.timestamps.push(now);
  store.set(ip, entry);
  return false;
}
