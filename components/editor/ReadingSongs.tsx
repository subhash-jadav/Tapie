"use client";
import { useEffect, useState } from "react";
import type { Track } from "@/lib/schema";

/** Full-screen "reading your songs…" moment while the first design is generated from all the songs. */
export function ReadingSongs({ tracks, done }: { tracks: Track[]; done: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (done || tracks.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % tracks.length), 900);
    return () => clearInterval(t);
  }, [done, tracks.length]);

  const t = tracks[i];
  return (
    <div className="fade-in fixed inset-0 z-[60] grid place-items-center bg-cream/85 px-6 backdrop-blur-md" role="status" aria-live="polite">
      <div className="pop-in flex w-full max-w-sm flex-col items-center text-center">
        {/* A little cassette whose reels spin while we read */}
        <svg viewBox="0 0 160 100" width="150" aria-hidden className="mb-6 drop-shadow-[0_10px_18px_rgba(0,0,0,.25)]">
          <rect x="2" y="2" width="156" height="96" rx="12" fill="#2b2118" />
          <rect x="12" y="10" width="136" height="54" rx="6" fill="#f4ead5" />
          <rect x="12" y="46" width="136" height="6" fill="#f2b134" />
          <rect x="12" y="52" width="136" height="6" fill="#e8742c" />
          <rect x="40" y="22" width="80" height="30" rx="15" fill="#1c1714" />
          {[60, 100].map((cx) => (
            <g key={cx} className="reel-spin" style={{ transformOrigin: `${cx}px 37px`, animationDuration: "1.1s" }}>
              <circle cx={cx} cy="37" r="10" fill="#f4ead5" />
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <rect key={a} x={cx - 1.5} y="29" width="3" height="5" fill="#2b2118" transform={`rotate(${a} ${cx} 37)`} />
              ))}
            </g>
          ))}
          <path d="M44 98 L50 76 H110 L116 98 Z" fill="#4a3a2e" />
        </svg>
        <p className="font-type text-xs tracking-[.3em] text-orange">{done ? "READY" : "READING YOUR SONGS"}</p>
        <h2 className="mt-2 font-display text-3xl leading-tight">{done ? "Your tape is ready ✨" : "Finding your vibe…"}</h2>
        <div className="mt-4 h-12 w-full overflow-hidden">
          {!done && t && (
            <div key={t.id + i} className="title-roll">
              <div className="truncate font-semibold">{t.title}</div>
              <div className="truncate text-sm text-ink/60">{t.artist}</div>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-ink/50">
          {tracks.length} song{tracks.length === 1 ? "" : "s"} · genre, era & artwork
        </p>
      </div>
    </div>
  );
}
