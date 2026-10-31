"use client";
import { useState } from "react";
import { LIMITS } from "@/lib/constants";
import type { Track } from "@/lib/schema";
import { formatTime, uid } from "@/lib/client";

type Imported = { kind: "video" | "playlist"; title: string; tracks: Omit<Track, "id" | "side">[] };

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

export function LinkInput({
  onImported,
  big,
}: {
  onImported: (r: Imported) => string | void;
  big?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await importLink(url);
      const note = onImported(r);
      setMsg({ ok: true, text: note || `Added ${r.tracks.length} song${r.tracks.length === 1 ? "" : "s"}` });
      setUrl("");
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className={`flex gap-2 ${big ? "flex-col sm:flex-row" : ""}`}>
        <input
          className={`input ${big ? "py-3 text-lg" : ""}`}
          placeholder="Paste a YouTube song or playlist link…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          inputMode="url"
          autoFocus={big}
        />
        <button className={`btn btn-primary shrink-0 ${big ? "py-3 text-lg" : ""}`} disabled={busy || !url.trim()}>
          {busy ? "Fetching…" : big ? "Fetch songs ⏏" : "Add"}
        </button>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-teal" : "text-cherry"}`}>{msg.text}</p>}
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
      <LinkInput onImported={onImported} />
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
          No songs yet. Paste a YouTube video or playlist link above.
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
