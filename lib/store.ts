// Cassette storage. With DATABASE_URL set (Vercel + Neon) records live in Postgres; otherwise one
// JSON file per cassette under DATA_DIR (default ./data). With BLOB_READ_WRITE_TOKEN set, photos are
// moved out of the record into Vercel Blob and the record keeps only their URLs.
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { del, put } from "@vercel/blob";
import { sql } from "./db";
import type { Cassette, CassetteInput } from "./schema";

const DIR = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "cassettes");
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

type StoredRecord = { cassette: Cassette; editKeyHash: string };

export const isValidId = (id: string) => /^[A-Za-z0-9]{10}$/.test(id);

function randomString(len: number) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const hashKey = (key: string) => crypto.createHash("sha256").update(key).digest("hex");

function keyMatches(key: string, hash: string) {
  const a = Buffer.from(hashKey(key), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const fileFor = (id: string) => path.join(DIR, `${id}.json`);

async function readRecord(id: string): Promise<StoredRecord | null> {
  if (!isValidId(id)) return null;
  const db = await sql();
  if (db) {
    const rows = await db`select data, edit_key_hash from cassettes where id = ${id}`;
    return rows[0] ? { cassette: rows[0].data as Cassette, editKeyHash: rows[0].edit_key_hash as string } : null;
  }
  try {
    return JSON.parse(await fs.readFile(fileFor(id), "utf8")) as StoredRecord;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function writeRecord(rec: StoredRecord) {
  const db = await sql();
  if (db) {
    const c = rec.cassette;
    await db`insert into cassettes (id, data, edit_key_hash, created_at, updated_at)
      values (${c.id}, ${JSON.stringify(c)}::jsonb, ${rec.editKeyHash}, ${c.createdAt}, ${c.updatedAt})
      on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at`;
    return;
  }
  await fs.mkdir(DIR, { recursive: true });
  const file = fileFor(rec.cassette.id);
  const tmp = `${file}.${randomString(6)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rec));
  await fs.rename(tmp, file);
}

async function removeRecord(id: string) {
  const db = await sql();
  if (db) await db`delete from cassettes where id = ${id}`;
  else await fs.unlink(fileFor(id));
}

// ---- Photos in Vercel Blob ----

const BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,/;

type Slot = { get: () => string; set: (v: string) => void };

/** Every photo in a cassette, with a setter to swap it for its Blob URL. */
function photoSlots(c: CassetteInput): Slot[] {
  const slots: Slot[] = [];
  if (c.cover.photo) slots.push({ get: () => c.cover.photo!, set: (v) => (c.cover.photo = v) });
  for (const surface of Object.values(c.layers)) {
    for (const l of surface) {
      if (l.type === "image" || l.type === "photo") slots.push({ get: () => l.value, set: (v) => (l.value = v) });
    }
  }
  return slots;
}

const blobUrls = (c: CassetteInput) => photoSlots(c).map((s) => s.get()).filter((v) => !DATA_URL.test(v));

/** Uploads new (data URL) photos to Blob; the same picture used twice is uploaded once. */
async function uploadPhotos(c: CassetteInput) {
  if (!BLOB) return;
  const uploads = new Map<string, Promise<string>>();
  await Promise.all(
    photoSlots(c).map(async (slot) => {
      const v = slot.get();
      const m = v.match(DATA_URL);
      if (!m) return;
      if (!uploads.has(v)) {
        const body = Buffer.from(v.slice(m[0].length), "base64");
        const ext = m[1] === "jpeg" ? "jpg" : m[1];
        uploads.set(
          v,
          put(`photos/${randomString(12)}.${ext}`, body, { access: "public", contentType: `image/${m[1]}`, addRandomSuffix: true }).then(
            (r) => r.url,
          ),
        );
      }
      slot.set(await uploads.get(v)!);
    }),
  );
}

/** Deletes Blob photos a cassette no longer uses (best effort: a failure only leaves a stray file). */
async function dropPhotos(urls: string[]) {
  if (BLOB && urls.length) await del(urls).catch(() => {});
}

// Serialize writes per cassette so concurrent saves can't interleave.
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(id, next.catch(() => {}));
  return next;
}

export async function getCassette(id: string): Promise<Cassette | null> {
  return (await readRecord(id))?.cassette ?? null;
}

export async function canEdit(id: string, key: string): Promise<boolean> {
  const rec = await readRecord(id);
  return !!rec && keyMatches(key, rec.editKeyHash);
}

export async function createCassette(input: CassetteInput) {
  let id = randomString(10);
  while (await readRecord(id)) id = randomString(10);
  const editKey = randomString(24);
  const now = new Date().toISOString();
  await uploadPhotos(input);
  const cassette: Cassette = { ...input, id, createdAt: now, updatedAt: now };
  await writeRecord({ cassette, editKeyHash: hashKey(editKey) });
  return { cassette, editKey };
}

export async function updateCassette(id: string, key: string, input: CassetteInput) {
  return withLock(id, async () => {
    const rec = await readRecord(id);
    if (!rec) return { status: "notfound" as const };
    if (!keyMatches(key, rec.editKeyHash)) return { status: "forbidden" as const };
    await uploadPhotos(input);
    const cassette: Cassette = {
      ...input,
      id,
      createdAt: rec.cassette.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await writeRecord({ cassette, editKeyHash: rec.editKeyHash });
    const kept = new Set(blobUrls(cassette));
    await dropPhotos(blobUrls(rec.cassette).filter((u) => !kept.has(u)));
    return { status: "ok" as const, cassette };
  });
}

export async function deleteCassette(id: string, key: string) {
  return withLock(id, async () => {
    const rec = await readRecord(id);
    if (!rec) return "notfound" as const;
    if (!keyMatches(key, rec.editKeyHash)) return "forbidden" as const;
    await removeRecord(id);
    await dropPhotos(blobUrls(rec.cassette));
    return "ok" as const;
  });
}
