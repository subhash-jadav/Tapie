"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultCassette } from "@/lib/defaults";
import type { CassetteInput } from "@/lib/schema";
import { Editor, DRAFT_KEY } from "@/components/editor/Editor";
import { SongInput, mergeTracks, splitSides } from "@/components/editor/SongsPanel";
import { TapeArt } from "@/components/Surfaces";
import { Stage } from "@/components/Stage";
import { ThemeToggle } from "@/components/ThemeToggle";

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

export default function CreatePage() {
  const [initial, setInitial] = useState<CassetteInput | null>(null);
  const [restored, setRestored] = useState(false);
  const [started, setStarted] = useState(false);
  const [version, setVersion] = useState(0);
  const [autoVibe, setAutoVibe] = useState(false);
  const [vibeHint, setVibeHint] = useState("");

  useEffect(() => {
    let draft: CassetteInput | null = null;
    try {
      draft = hydrateDraft(localStorage.getItem(DRAFT_KEY));
    } catch {}
    if (draft && draft.tracks.length) {
      setRestored(true);
      setStarted(true);
    }
    setInitial(draft ?? defaultCassette());
  }, []);

  function startOver() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setInitial(defaultCassette());
    setRestored(false);
    setStarted(false);
    setAutoVibe(false);
    setVersion((v) => v + 1);
  }

  if (!initial) return null;

  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-2xl">
            Tapie<span className="text-orange">.</span>
          </Link>
          <ThemeToggle />
        </header>
        <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 items-center gap-10 px-4 pb-16 md:grid-cols-2">
          <div className="pop-in">
            <p className="mb-2 font-type text-sm tracking-widest text-orange">STEP 1 · THE SONGS</p>
            <h1 className="mb-4 font-display text-4xl leading-tight sm:text-5xl">What's on the tape?</h1>
            <p className="mb-6 text-lg text-ink/70">
              Search for a song, or paste a YouTube song or a whole playlist link. You can add more, reorder and split sides A & B later.
            </p>
            <SongInput
              big
              onImported={(r) => {
                const res = mergeTracks([], r.tracks);
                setInitial((d) => ({
                  ...d!,
                  title: r.kind === "playlist" ? r.title.slice(0, 60) : d!.title,
                  tracks: splitSides(res.tracks),
                }));
                setVibeHint(r.query ?? (r.kind === "playlist" ? r.title : ""));
                setAutoVibe(true);
                setStarted(true);
              }}
            />
            <p className="mt-4 text-sm text-ink/60">
              Works with youtube.com, youtu.be, YouTube Music and public playlists & albums ·{" "}
              <button className="-my-2 inline-block py-2 underline" onClick={() => setStarted(true)}>
                skip, decorate first
              </button>
            </p>
          </div>
          <div className="float mx-auto w-full max-w-md">
            <Stage>
              <TapeArt c={{ ...initial, title: "your songs here" }} side="A" spinning />
            </Stage>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      {restored && (
        <div className="bg-mustard/40 px-4 py-2 text-center text-sm">
          We restored your unsaved mixtape.{" "}
          <button className="font-semibold underline" onClick={startOver}>
            Start over
          </button>
        </div>
      )}
      <Editor key={version} initial={initial} autoVibe={autoVibe} vibeHint={vibeHint} />
    </>
  );
}
