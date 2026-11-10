// Best-effort, per server instance. On Vercel each warm function keeps its own Map.
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function allow(key: string, now: number = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);

    if (hits.size > 1000) {
      for (const [k, times] of hits) if (now - times[times.length - 1] >= windowMs) hits.delete(k);
    }
    return true;
  };
}
