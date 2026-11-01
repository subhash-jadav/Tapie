"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { defaultCassette } from "@/lib/defaults";
import type { CassetteInput, Track } from "@/lib/schema";
import { formatTime } from "@/lib/client";
import { animateOut, startDrag, useFlip } from "@/lib/motion";
import { sfx } from "@/lib/sfx";
import { Editor, DRAFT_KEY } from "@/components/editor/Editor";
import { SongInput, mergeTracks, splitSides, type Imported } from "@/components/editor/SongsPanel";
import { TapeArt } from "@/components/Surfaces";
import { Stage } from "@/components/Stage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteFooter } from "@/components/SiteFooter";

// Songs picked on the start screen, kept across reloads until "Start designing".
const COLLECT_KEY = "tapie:collect";
type Collected = { tracks: Track[]; title: string; hint: string };

// Merge a saved draft over defaults so older drafts missing new fields still work.
function hydrateDraft(raw: string | null): CassetteInput | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    const d = defaultCassette();
    return {
      ...d,
      ...p,
      tape: { ...d.tape, ...p.tape },
      cover: { ...d.cover, ...p.cover },
      inside: { ...d.inside, ...p.inside },
      layers: { ...d.layers, ...p.layers },
      tracks: Array.isArray(p.tracks) ? p.tracks : [],
    };
  } catch {
    return null;
  }
}

function readCollected(): Collected {
  try {
    const c = JSON.parse(localStorage.getItem(COLLECT_KEY) || "null");
    if (c && Array.isArray(c.tracks)) return { tracks: c.tracks, title: c.title ?? "", hint: c.hint ?? "" };
  } catch {}
  return { tracks: [], title: "", hint: "" };
}

export default function CreatePage() {
  const [initial, setInitial] = useState<CassetteInput | null>(null);
  const [restored, setRestored] = useState(false);
  const [started, setStarted] = useState(false);
  const [version, setVersion] = useState(0);
  const [autoVibe, setAutoVibe] = useState(false);
  const [picked, setPicked] = useState<Collected>({ tracks: [], title: "", hint: "" });
  const [ready, setReady] = useState(false);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  const pickedListRef = useRef<HTMLOListElement>(null);
  useFlip(pickedListRef, [picked.tracks.map((t) => t.id).join()]);

  useEffect(() => {
    let draft: CassetteInput | null = null;
    try {
      draft = hydrateDraft(localStorage.getItem(DRAFT_KEY));
    } catch {}
    if (draft && draft.tracks.length) {
      setRestored(true);
      setStarted(true);
      setInitial(draft);
    } else {
      setInitial(draft ?? defaultCassette());
      setPicked(readCollected());
    }
    setReady(true);
  }, []);

  // Keep the picked songs so a reload doesn't lose them.
  useEffect(() => {
    if (!ready || started) return;
    try {
      if (picked.tracks.length) localStorage.setItem(COLLECT_KEY, JSON.stringify(picked));
      else localStorage.removeItem(COLLECT_KEY);
    } catch {}
  }, [picked, ready, started]);

  function onImported(r: Imported) {
    const res = mergeTracks(pickedRef.current.tracks, r.tracks);
    setPicked((p) => ({
      tracks: res.tracks,
      title: p.title || (r.kind === "playlist" ? r.title.slice(0, 60) : ""),
      hint: `${p.hint} ${r.query ?? (r.kind === "playlist" ? r.title : "")}`.trim().slice(-400),
    }));
    const extra = [res.dupes && `${res.dupes} already picked`, res.cut && `${res.cut} didn't fit (max 100)`].filter(Boolean);
    return `Added ${res.added} song${res.added === 1 ? "" : "s"}${extra.length ? ` · ${extra.join(" · ")}` : ""}`;
  }

  /** Move a picked song to position `to` (drag), or one step up/down (buttons). */
  function movePicked(id: string, to: number) {
    setPicked((p) => {
      const from = p.tracks.findIndex((t) => t.id === id);
      if (from < 0 || to < 0 || to >= p.tracks.length || to === from) return p;
      const next = [...p.tracks];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return { ...p, tracks: next };
    });
  }

  function removePicked(id: string, el: Element | null) {
    sfx("remove");
    animateOut(el, () => setPicked((p) => ({ ...p, tracks: p.tracks.filter((t) => t.id !== id) })), { collapse: true });
  }

  /** Open the editor. With songs, the design is generated once from all of them. */
  function startDesigning() {
    const p = pickedRef.current;
    sfx("tape");
    setInitial((d) => ({ ...d!, title: d!.title || p.title, tracks: splitSides(p.tracks) }));
    setAutoVibe(p.tracks.length > 0);
    setStarted(true);
    try {
      localStorage.removeItem(COLLECT_KEY);
    } catch {}
  }

  function startOver() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(COLLECT_KEY);
    } catch {}
    setInitial(defaultCassette());
    setPicked({ tracks: [], title: "", hint: "" });
    setRestored(false);
    setStarted(false);
    setAutoVibe(false);
    setVersion((v) => v + 1);
  }

  if (!initial || !ready) return null;

  if (!started) {
    const tracks = picked.tracks;
    const total = tracks.reduce((s, t) => s + (t.duration ?? 0), 0);
    const has = tracks.length > 0;
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-2xl">
            Tapiee<span className="text-orange">.</span>
          </Link>
          <ThemeToggle />
        </header>
        <main className={`mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-8 px-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-10 ${has ? "items-start pb-28 md:pb-16 md:pt-6" : "items-center pb-16"}`}>
          <div className="pop-in min-w-0">
            <p className="mb-2 font-type text-sm tracking-widest text-orange">STEP 1 · THE SONGS</p>
            <h1 className="mb-4 font-display text-4xl leading-tight sm:text-5xl">What's on the tape?</h1>
            <p className="mb-6 text-lg text-ink/70">
              Search for songs or paste YouTube links and whole playlists. Add as many as you like, then start designing.
            </p>
            <SongInput big onImported={onImported} existing={new Set(tracks.map((t) => t.videoId))} />
            <p className="mt-4 text-sm text-ink/60">
              Works with youtube.com, youtu.be, YouTube Music and public playlists & albums
              {!has && (
                <>
                  {" · "}
                  <button className="-my-2 inline-block py-2 underline" onClick={startDesigning}>
                    skip, decorate first
                  </button>
                </>
              )}
            </p>
          </div>

          {has ? (
            <section className="card pop-in overflow-hidden" aria-label="Your tape">
              <div className="flex items-center justify-between gap-3 border-b-2 border-ink/10 px-4 py-3">
                <div>
                  <h2 className="font-display text-xl leading-none">Your tape</h2>
                  <p className="mt-1 text-xs text-ink/60">
                    <span key={tracks.length} className="pop-in inline-block font-semibold text-ink">
                      {tracks.length}
                    </span>{" "}
                    song{tracks.length === 1 ? "" : "s"}
                    {total > 0 && ` · ${formatTime(total)}`} · split into sides A & B
                  </p>
                </div>
                <span className="text-2xl" aria-hidden>
                  📼
                </span>
              </div>
              <ol ref={pickedListRef} className="max-h-[46dvh] overflow-y-auto p-2 md:max-h-[52dvh]">
                {tracks.map((t, i) => (
                  <li
                    key={t.id}
                    data-flip-id={t.id}
                    className="row-in flex items-center gap-2 rounded-lg bg-paper px-1.5 py-1.5 transition-colors hover:bg-ink/5"
                    style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                  >
                    <span
                      className="grid h-9 w-5 shrink-0 cursor-grab touch-none select-none place-items-center text-ink/35 hover:text-ink active:cursor-grabbing"
                      onPointerDown={(e) =>
                        startDrag(e, (id, to) => {
                          movePicked(id, to);
                          sfx("pop");
                        })
                      }
                      title="Drag to reorder"
                      aria-hidden
                    >
                      ⠿
                    </span>
                    <span className="w-4 shrink-0 text-right text-xs text-ink/40">{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" className="h-9 w-12 shrink-0 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{t.title}</div>
                      <div className="truncate text-xs text-ink/60">{t.artist}</div>
                    </div>
                    <span className="hidden text-xs text-ink/50 sm:block">{formatTime(t.duration)}</span>
                    <div className="flex shrink-0 items-center">
                      <button className="h-8 w-6 rounded text-xs text-ink/60 hover:bg-ink/5 disabled:opacity-25" disabled={i === 0} onClick={() => movePicked(t.id, i - 1)} aria-label={`Move ${t.title} up`}>
                        ▲
                      </button>
                      <button
                        className="h-8 w-6 rounded text-xs text-ink/60 hover:bg-ink/5 disabled:opacity-25"
                        disabled={i === tracks.length - 1}
                        onClick={() => movePicked(t.id, i + 1)}
                        aria-label={`Move ${t.title} down`}
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink/40 transition-colors hover:bg-cherry/10 hover:text-cherry"
                      onClick={(e) => removePicked(t.id, e.currentTarget.closest("li"))}
                      aria-label={`Remove ${t.title}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
              <div className="border-t-2 border-ink/10 p-3 max-md:hidden">
                <button className="btn btn-primary w-full py-3 text-lg" onClick={startDesigning}>
                  Start designing →
                </button>
              </div>
            </section>
          ) : (
            <div className="float mx-auto w-full max-w-md">
              <Stage>
                <TapeArt c={{ ...initial, title: "your songs here" }} side="A" spinning />
              </Stage>
            </div>
          )}
        </main>
        {/* Extra room on phones so the pinned button never covers the footer. */}
        <SiteFooter className={has ? "max-md:pb-24" : ""} />

        {/* Phones: the button stays within thumb reach while picking songs. */}
        {has && (
          <div className="row-in fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink/10 bg-cream/90 p-3 backdrop-blur md:hidden">
            <button className="btn btn-primary w-full py-3 text-lg" onClick={startDesigning}>
              Start designing · {tracks.length} song{tracks.length === 1 ? "" : "s"} →
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {restored && (
        <div className="row-in bg-mustard/40 px-4 py-2 text-center text-sm">
          We restored your unsaved mixtape.{" "}
          <button className="font-semibold underline" onClick={startOver}>
            Start over
          </button>
        </div>
      )}
      <Editor key={version} initial={initial} autoVibe={autoVibe} vibeHint={picked.hint} />
    </>
  );
}
