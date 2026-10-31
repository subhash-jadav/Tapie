// Simple fixed-window, in-memory rate limiter (per server process).
const buckets = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  b.n++;
  return b.n <= limit;
}

// Forwarding headers can be forged by anyone, so they are only trusted behind a known proxy
// (Vercel, or TRUST_PROXY=1 when behind your own reverse proxy that sets them).
const TRUST_PROXY = process.env.TRUST_PROXY === "1" || process.env.VERCEL === "1";

export function clientIp(req: Request): string {
  if (!TRUST_PROXY) return "direct"; // one shared bucket — safe, if strict, without a proxy
  // Proxies append to X-Forwarded-For; the right-most entry was added by our proxy, not the client.
  const xff = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return xff?.at(-1) || req.headers.get("x-real-ip") || "unknown";
}
