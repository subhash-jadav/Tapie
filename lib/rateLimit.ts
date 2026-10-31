import { sql } from "./db";

// Fixed-window rate limiter. Shared through Postgres when DATABASE_URL is set (Vercel runs many copies
// of the app, so memory alone isn't enough); otherwise in memory, per server process.
const buckets = new Map<string, { n: number; reset: number }>();

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const db = await sql();
  if (db) {
    const rows = await db`insert into rate_limits (key, n, reset_at)
      values (${key}, 1, now() + ${windowMs} * interval '1 millisecond')
      on conflict (key) do update set
        n = case when rate_limits.reset_at < now() then 1 else rate_limits.n + 1 end,
        reset_at = case when rate_limits.reset_at < now() then excluded.reset_at else rate_limits.reset_at end
      returning n`;
    if (Math.random() < 0.01) await db`delete from rate_limits where reset_at < now()`;
    return (rows[0].n as number) <= limit;
  }
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
