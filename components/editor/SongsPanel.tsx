"use client";
import { useEffect, useRef, useState } from "react";
import { LIMITS } from "@/lib/constants";
import type { Track } from "@/lib/schema";
import { formatTime, uid } from "@/lib/client";

// `query` is the search text a song was found with — a hint for vibe detection.
export type Imported = { kind: "video" | "playlist"; title: string; tracks: Omit<Track, "id" | "side">[]; query?: string };

export async function importLink(url: string): Promise<Imported> {
  const res = await fetch("/api/youtube", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong.");
  return json as Imported;
}

export function splitSides(tracks: Track[]): Track[] {
  const half = Math.ceil(tracks.length / 2);
  return tracks.map((t, i) => ({ ...t, side: i < half ? "A" : "B" }));
}

/** Merge imported songs into the list, skipping duplicates and respecting the track limit. */
export function mergeTracks(existing: Track[], incoming: Imported["tracks"]) {
  const have = new Set(existing.map((t) => t.videoId));
  const fresh = incoming.filter((t) => !have.has(t.videoId));
  const room = LIMITS.tracks - existing.length;
  const added: Track[] = fresh.slice(0, Math.max(0, room)).map((t) => ({ ...t, id: uid(), side: "A" }));
  return { tracks: [...existing, ...added], added: added.length, dupes: incoming.length - fresh.length, cut: Math.max(0, fresh.length - room) };
}

const isLink = (s: string) => /youtu\.?be|youtube\.com|^https?:\/\/|^www\./i.test(s.trim());

type Result = Imported["tracks"][number];

async function searchSongs(q: string): Promise<Result[]> {
  const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Search failed.");
  return json.results as Result[];
}

/** One box for everything: paste a video/playlist link, or type a song name to search. */
export function SongInput({
  onImported,
  big,
  existing,
}: {
  onImported: (r: Imported) => string | void;
  big?: boolean;
  existing?: Set<string>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const reqId = useRef(0);
  const link = isLink(text);

  async function runSearch(q: string) {
    const id = ++reqId.current;
    setSearching(true);
    try {
      const r = await searchSongs(q);
      if (id !== reqId.current) return;
      setResults(r);
      setMsg(r.length ? null : { ok: false, text: "No songs found. Try different words." });
    } catch (err) {
      if (id === reqId.current) setMsg({ ok: false, text: (err as Error).message });
    } finally {
      if (id === reqId.current) setSearching(false);
    }
  }

  // Search as you type (debounced). Links wait for the button/Enter.
  useEffect(() => {
    const q = text.trim();
    if (link || q.length < 2) {
      reqId.current++;
      setSearching(false);
      if (!q) setResults(null);
      return;
    }
    const t = setTimeout(() => runSearch(q), 500);
    return () => clearTimeout(t);
  }, [text, link]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    if (!link) return runSearch(q);
    setBusy(true);
    setMsg(null);
    try {
      const r = await importLink(q);
      const note = onImported(r);
      setMsg({ ok: true, text: note || `Added ${r.tracks.length} song${r.tracks.length === 1 ? "" : "s"}` });
      setText("");
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function add(r: Result) {
    onImported({ kind: "video", title: r.title, tracks: [r], query: text.trim() });
    setAdded((a) => new Set(a).add(r.videoId));
  }

  const size = big ? "py-3 text-lg" : "";
  return (
    <form onSubmit={submit}>
      <div className={`flex gap-2 ${big ? "flex-col sm:flex-row" : ""}`}>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">{link ? "🔗" : "🔍"}</span>
          <input
            className={`input pl-9 ${size}`}
            placeholder="Song name or YouTube link"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus={big}
            enterKeyHint={link ? "go" : "search"}
          />
        </div>
        <button className={`btn btn-primary shrink-0 ${size}`} disabled={busy || !text.trim()}>
          {busy ? "Fetching…" : link ? (big ? "Fetch songs ⏏" : "Add") : searching ? "Searching…" : "Search"}
        </button>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-teal" : "text-cherry"}`}>{msg.text}</p>}

      {results && results.length > 0 && !link && (
        <div className="pop-in mt-3 overflow-hidden rounded-xl border-2 border-ink bg-white">
          <div className="flex items-center justify-between border-b-2 border-ink/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink/60">
            <span>{searching ? "Searching…" : "Results"}</span>
            <button type="button" className="text-ink/50 hover:text-ink" onClick={() => setResults(null)} aria-label="Close results">
              ✕
            </button>
          </div>
          <ul className={`overflow-y-auto ${big ? "max-h-[50dvh]" : "max-h-80"}`}>
            {results.map((r) => {
              const done = added.has(r.videoId) || existing?.has(r.videoId);
              return (
                <li key={r.videoId} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-cream/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${r.videoId}/default.jpg`} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-semibold">{r.title}</div>
                    <div className="truncate text-xs text-ink/60">
                      {r.artist}
                      {r.duration ? ` · ${formatTime(r.duration)}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm shrink-0 ${done ? "btn-ghost" : "btn-dark"}`}
                    disabled={done}
                    onClick={() => add(r)}
                  >
                    {done ? "✓ Added" : "+ Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </form>
  );
}

export function SongsPanel({
  tracks,
  onChange,
  onImported,
}: {
  tracks: Track[];
  onChange: (t: Track[]) => void;
  onImported: (r: Imported) => string | void;
}) {
  const total = tracks.reduce((s, t) => s + (t.duration ?? 0), 0);
  const sides = (["A", "B"] as const).map((s) => ({ side: s, list: tracks.filter((t) => t.side === s) }));

  const patch = (id: string, p: Partial<Track>) => onChange(tracks.map((t) => (t.id === id ? { ...t, ...p } : t)));

  function move(id: string, dir: -1 | 1) {
    const i = tracks.findIndex((t) => t.id === id);
    const side = tracks[i].side;
    let j = i + dir;
    while (j >= 0 && j < tracks.length && tracks[j].side !== side) j += dir;
    if (j < 0 || j >= tracks.length) return;
    const next = [...tracks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      <SongInput onImported={onImported} existing={new Set(tracks.map((t) => t.videoId))} />
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-semibold">
          {tracks.length} / {LIMITS.tracks} songs {total > 0 && <span className="text-ink/50">· {formatTime(total)}</span>}
        </span>
        {tracks.length > 1 && (
          <button className="btn btn-ghost btn-sm" onClick={() => onChange(splitSides(tracks))}>
            Split A / B evenly
          </button>
        )}
      </div>

      {tracks.length === 0 && (
        <p className="mt-6 rounded-xl border-2 border-dashed border-ink/25 p-6 text-center text-sm text-ink/60">
          No songs yet. Search for a song or paste a YouTube video / playlist link above.
        </p>
      )}

      {sides.map(({ side, list }) =>
        list.length ? (
          <div key={side} className="mt-4">
            <div className="mb-1.5 font-type text-sm tracking-widest">SIDE {side}</div>
            <ul className="space-y-1.5">
              {list.map((t, i) => (
                <li key={t.id} className="flex items-center gap-2 rounded-xl border-2 border-ink/15 bg-white p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" className="h-9 w-12 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <input
                      className="w-full truncate bg-transparent text-sm font-semibold outline-none focus:underline"
                      value={t.title}
                      maxLength={200}
                      onChange={(e) => patch(t.id, { title: e.target.value })}
                      onBlur={(e) => !e.target.value.trim() && patch(t.id, { title: "Untitled" })}
                      aria-label="Song title"
                    />
                    <input
                      className="w-full truncate bg-transparent text-xs text-ink/60 outline-none focus:underline"
                      value={t.artist}
                      maxLength={120}
                      placeholder="Artist"
                      onChange={(e) => patch(t.id, { artist: e.target.value })}
                      aria-label="Artist"
                    />
                  </div>
                  <span className="hidden text-xs text-ink/50 sm:block">{formatTime(t.duration)}</span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button className="h-7 w-6 rounded hover:bg-cream disabled:opacity-25" disabled={i === 0} onClick={() => move(t.id, -1)} aria-label="Move up">
                      ▲
                    </button>
                    <button
                      className="h-7 w-6 rounded hover:bg-cream disabled:opacity-25"
                      disabled={i === list.length - 1}
                      onClick={() => move(t.id, 1)}
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                    <button
                      className="h-7 rounded-md border-2 border-ink px-1.5 font-type text-xs"
                      style={{ background: side === "A" ? "#f2b134" : "#98c1d9" }}
                      onClick={() => patch(t.id, { side: side === "A" ? "B" : "A" })}
                      title="Move to the other side"
                    >
                      →{side === "A" ? "B" : "A"}
                    </button>
                    <button
                      className="h-7 w-7 rounded text-cherry hover:bg-cherry/10"
                      onClick={() => onChange(tracks.filter((x) => x.id !== t.id))}
                      aria-label="Remove song"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  );
}
