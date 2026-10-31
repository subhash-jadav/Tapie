// File-based storage: one JSON file per cassette under DATA_DIR (default ./data).
// Swap this module for a database adapter when deploying to a host without a disk.
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
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
  try {
    return JSON.parse(await fs.readFile(fileFor(id), "utf8")) as StoredRecord;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function writeRecord(rec: StoredRecord) {
  await fs.mkdir(DIR, { recursive: true });
  const file = fileFor(rec.cassette.id);
  const tmp = `${file}.${randomString(6)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rec));
  await fs.rename(tmp, file);
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
  const cassette: Cassette = { ...input, id, createdAt: now, updatedAt: now };
  await writeRecord({ cassette, editKeyHash: hashKey(editKey) });
  return { cassette, editKey };
}

export async function updateCassette(id: string, key: string, input: CassetteInput) {
  return withLock(id, async () => {
    const rec = await readRecord(id);
    if (!rec) return { status: "notfound" as const };
    if (!keyMatches(key, rec.editKeyHash)) return { status: "forbidden" as const };
    const cassette: Cassette = {
      ...input,
      id,
      createdAt: rec.cassette.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await writeRecord({ cassette, editKeyHash: rec.editKeyHash });
    return { status: "ok" as const, cassette };
  });
}

export async function deleteCassette(id: string, key: string) {
  return withLock(id, async () => {
    const rec = await readRecord(id);
    if (!rec) return "notfound" as const;
    if (!keyMatches(key, rec.editKeyHash)) return "forbidden" as const;
    await fs.unlink(fileFor(id));
    return "ok" as const;
  });
}
