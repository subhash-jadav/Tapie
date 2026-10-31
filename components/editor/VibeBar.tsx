"use client";
import { useState } from "react";
import { VIBE_INFO, VIBES, type VibeKey } from "@/lib/vibes";

export type CoverMode = "pattern" | "single" | "collage";

export function VibeBar({
  vibe,
  moodText,
  busy,
  hasPhoto,
  onPick,
  onShuffle,
  onPlain,
  onCover,
}: {
  vibe?: VibeKey;
  /** Describes the generated mood, e.g. "moody · mellow · warm". */
  moodText?: string;
  busy: boolean;
  hasPhoto: boolean;
  onPick: (v?: VibeKey) => void;
  onShuffle: () => void;
  onPlain: () => void;
  onCover: (m: CoverMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const p = vibe ? VIBE_INFO[vibe] : null;

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-mustard/60 px-3 py-1 text-sm font-semibold transition hover:bg-mustard"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          ✨ {moodText ?? (p ? `${p.emoji} ${p.label}` : "Style by vibe")} <span className="text-xs">{open ? "▴" : "▾"}</span>
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onShuffle} disabled={busy} title="Same mood, new combination">
          🎲 Shuffle
        </button>
        {busy && <span className="text-xs text-ink/60">styling…</span>}
      </div>

      {open && (
        <div className="card pop-in mt-2 p-3 sm:p-4">
          <p className="label">Steer the mood</p>
          <div className="grid grid-cols-3 gap-1.5">
            {VIBES.map((v) => (
              <button
                key={v}
                className="chip flex flex-col items-center gap-0.5 py-1.5 text-xs"
                data-on={v === vibe}
                disabled={busy}
                onClick={() => onPick(v)}
              >
                <span className="text-lg leading-none">{VIBE_INFO[v].emoji}</span>
                {VIBE_INFO[v].label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn btn-dark btn-sm" disabled={busy} onClick={() => onPick(undefined)}>
              🔮 Read my songs again
            </button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={onPlain}>
              Plain design
            </button>
          </div>

          <p className="label mt-4">Cover art</p>
          <div className="flex flex-wrap gap-1.5">
            <button className="chip" data-on={!hasPhoto} disabled={busy} onClick={() => onCover("pattern")}>
              Pattern
            </button>
            <button className="chip" disabled={busy} onClick={() => onCover("single")}>
              Top song art
            </button>
            <button className="chip" disabled={busy} onClick={() => onCover("collage")}>
              Song collage
            </button>
          </div>
          <p className="mt-3 text-xs text-ink/55">
            Colors come from your songs' artwork; the mood picks fonts, textures & labels. Your songs, message and own stickers stay.
          </p>
        </div>
      )}
    </div>
  );
}
