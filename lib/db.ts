// Neon Postgres, used when DATABASE_URL is set (Vercel adds it when a Neon database is connected).
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let ready: Promise<NeonQueryFunction<false, false>> | null = null;

/** The SQL client with its tables created, or null when running on local files. */
export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  ready ??= (async () => {
    const db = neon(url);
    await db`create table if not exists cassettes (
      id text primary key,
      data jsonb not null,
      edit_key_hash text not null,
      created_at timestamptz not null,
      updated_at timestamptz not null
    )`;
    await db`create table if not exists rate_limits (key text primary key, n int not null, reset_at timestamptz not null)`;
    return db;
  })().catch((e) => {
    ready = null; // retry on the next request instead of remembering the failure
    throw e;
  });
  return ready;
}
