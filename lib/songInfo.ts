// Server-only: free, keyless metadata about a song, used to guess its vibe.
//  - iTunes Search API → genre + release year
//  - YouTube watch page → creator tags, description, ℗ year

import type { SongSignals } from "./vibes";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const CACHE_MS = 24 * 60 * 60_000;

function cached<T>(store: Map<string, { at: number; v: T }>, key: string, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.v);
  return load().then((v) => {
    store.set(key, { at: Date.now(), v });
    if (store.size > 5000) store.delete(store.keys().next().value!);
    return v;
  });
}

type Itunes = { genre?: string; year?: number };
const itunesCache = new Map<string, { at: number; v: Itunes }>();

function itunes(title: string, artist: string): Promise<Itunes> {
  const term = `${artist} ${title}`.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  return cached(itunesCache, term.toLowerCase(), async () => {
    try {
      const res = await fetch(`https://itunes.apple.com/search?entity=song&limit=1&term=${encodeURIComponent(term)}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return {};
      const r = (await res.json()).results?.[0];
      if (!r) return artistGenre(artist);
      const year = Number(String(r.releaseDate ?? "").slice(0, 4));
      return { genre: r.primaryGenreName, year: year > 1900 ? year : undefined };
    } catch {
      return {};
    }
  });
}

// Fallback when the song isn't in the catalogue: the artist's main genre.
async function artistGenre(artist: string): Promise<Itunes> {
  if (!artist.trim()) return {};
  try {
    const res = await fetch(`https://itunes.apple.com/search?entity=musicArtist&limit=1&term=${encodeURIComponent(artist)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return {};
    return { genre: (await res.json()).results?.[0]?.primaryGenreName };
  } catch {
    return {};
  }
}

type YtMeta = { tags: string[]; description: string; year?: number };
const ytCache = new Map<string, { at: number; v: YtMeta }>();

function youtubeMeta(videoId: string): Promise<YtMeta> {
  return cached(ytCache, videoId, async () => {
    try {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
        headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9", cookie: "CONSENT=YES+1; SOCS=CAI" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { tags: [], description: "" };
      const m = (await res.text()).match(/var ytInitialPlayerResponse = (\{.*?\});(?:var|<\/script>)/s);
      const d = m ? JSON.parse(m[1]).videoDetails ?? {} : {};
      const description: string = (d.shortDescription ?? "").slice(0, 600);
      // "℗ 1976 Asylum" or "Released on: 1976-12-08" in official uploads.
      const years = [...description.matchAll(/(?:℗|released on:?)\s*(\d{4})/gi)].map((x) => Number(x[1]));
      return { tags: (d.keywords ?? []).slice(0, 25), description, year: years.length ? Math.min(...years) : undefined };
    } catch {
      return { tags: [], description: "" };
    }
  });
}

// Run promises with a small concurrency limit (keeps us polite to both services).
async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

/** Gather signals for up to `max` songs spread across the tape. */
export async function songSignals(tracks: { videoId: string; title: string; artist: string }[], max = 10): Promise<SongSignals[]> {
  const step = Math.max(1, tracks.length / max);
  const sample = Array.from({ length: Math.min(max, tracks.length) }, (_, i) => tracks[Math.floor(i * step)]);
  return pool(sample, 4, async (t) => {
    const [it, yt] = await Promise.all([itunes(t.title, t.artist), youtubeMeta(t.videoId)]);
    const years = [it.year, yt.year].filter((y): y is number => !!y);
    return {
      title: t.title,
      artist: t.artist,
      genre: it.genre,
      year: years.length ? Math.min(...years) : undefined,
      tags: yt.tags,
      description: yt.description,
    };
  });
}
