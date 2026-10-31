"use client";
import type { ReactNode, RefObject } from "react";
import { formatTime } from "@/lib/client";

const SEGMENTS = 24;
const BARS = 18;

const Icon = {
  play: <path d="M8 5v14l11-7z" />,
  pause: <path d="M6 5h4v14H6zM14 5h4v14h-4z" />,
  prev: <path d="M6 5h2v14H6zM20 5v14L9 12z" />,
  next: <path d="M16 5h2v14h-2zM4 5v14l11-7z" />,
};

function Svg({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      {children}
    </svg>
  );
}

function Marquee({ text }: { text: string }) {
  if (text.length <= 22) return <span className="block truncate">{text}</span>;
  return (
    <span className="block overflow-hidden whitespace-nowrap">
      <span className="marquee" style={{ animationDuration: `${Math.max(8, text.length * 0.35)}s` }}>
        <span>{text}</span>
        <span aria-hidden>{text}</span>
      </span>
    </span>
  );
}

export type RetroPlayerProps = {
  ready: boolean;
  playing: boolean;
  buffering: boolean;
  started: boolean;
  time: { current: number; duration: number };
  title: string;
  artist: string;
  side: "A" | "B";
  trackNo: number;
  trackCount: number;
  hasOtherSide: boolean;
  volume: number;
  showVideo: boolean;
  notice: string | null;
  hostRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (sec: number) => void;
  onFlipSide: () => void;
  onVolume: (v: number) => void;
  onShowVideo: (v: boolean) => void;
};

/** A cute walkman-style player. The YouTube embed stays mounted (it provides the audio) but hidden unless asked for. */
export function RetroPlayer(p: RetroPlayerProps) {
  const { current, duration } = p.time;
  const frac = duration ? Math.min(1, current / duration) : 0;
  const lit = Math.round(frac * SEGMENTS);
  const status = !p.ready ? "LOADING" : p.buffering ? "BUFFER" : p.playing ? "▶ PLAY" : p.started ? "❚❚ PAUSE" : "■ STOP";

  return (
    <div className="device relative mx-auto w-full max-w-md rounded-[28px] border-2 border-ink p-4 text-ink sm:p-5">
      <div className="mb-3 flex items-center justify-between px-1 font-type text-[11px] tracking-[.2em] text-ink/60">
        <span>TAPIE · MX-90</span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full transition ${p.playing ? "bg-cherry shadow-[0_0_8px_#d1495b]" : "bg-ink/25"}`} />
          STEREO
        </span>
      </div>

      {/* Screen */}
      <div className="rounded-2xl bg-ink p-2.5 shadow-[inset_0_2px_0_rgba(255,255,255,.15)]">
        <div className="lcd px-3.5 py-2.5">
          <div className="flex justify-between text-lg leading-none opacity-80">
            <span>
              SIDE {p.side} · {String(Math.max(1, p.trackNo)).padStart(2, "0")}/{String(p.trackCount).padStart(2, "0")}
            </span>
            <span>{status}</span>
          </div>
          <div className="mt-1.5 text-[28px] leading-none">
            <Marquee text={p.title || "—"} />
          </div>
          <div className="truncate text-lg leading-tight opacity-75">{p.artist || " "}</div>

          <div className="mt-2 flex h-7 items-end gap-[3px]" aria-hidden>
            {Array.from({ length: BARS }, (_, i) => (
              <span
                key={i}
                className="eq-bar flex-1 rounded-[1px] bg-current opacity-80"
                style={{
                  height: "100%",
                  animationDuration: `${0.45 + ((i * 37) % 50) / 100}s`,
                  animationDelay: `${-((i * 13) % 10) / 10}s`,
                  animationPlayState: p.playing ? "running" : "paused",
                  transform: p.playing ? undefined : `scaleY(${0.1 + ((i * 7) % 5) / 25})`,
                  animationName: p.playing ? undefined : "none",
                }}
              />
            ))}
          </div>

          <div className="relative mt-2.5 flex gap-[3px]">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span key={i} className="h-2.5 flex-1 rounded-[1px] bg-current" style={{ opacity: i < lit ? 0.85 : 0.15 }} />
            ))}
            <input
              type="range"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              min={0}
              max={duration || 1}
              step={1}
              value={current}
              disabled={!p.started || !duration}
              onChange={(e) => p.onSeek(Number(e.target.value))}
              aria-label="Seek"
            />
          </div>
          <div className="mt-1 flex justify-between text-lg leading-none opacity-80">
            <span>{formatTime(current) || "0:00"}</span>
            <span>{duration ? `-${formatTime(duration - current) || "0:00"}` : "--:--"}</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button className="hw-btn h-12 w-12" onClick={p.onPrev} disabled={!p.ready} aria-label="Previous">
          <Svg>{Icon.prev}</Svg>
        </button>
        <button className="hw-btn hw-btn-primary h-16 w-16" onClick={p.onToggle} disabled={!p.ready} aria-label={p.playing ? "Pause" : "Play"}>
          <Svg size={30}>{p.playing ? Icon.pause : Icon.play}</Svg>
        </button>
        <button className="hw-btn h-12 w-12" onClick={p.onNext} disabled={!p.ready || !p.started} aria-label="Next">
          <Svg>{Icon.next}</Svg>
        </button>
      </div>

      {/* Volume, side switch, video */}
      <div className="mt-5 flex items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 font-type text-xs tracking-widest text-ink/70">
          VOL
          <input
            type="range"
            className="vol min-w-0 flex-1"
            min={0}
            max={100}
            value={p.volume}
            onChange={(e) => p.onVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </label>
        <div className="flex shrink-0 overflow-hidden rounded-full border-2 border-ink font-type text-xs" role="group" aria-label="Tape side">
          {(["A", "B"] as const).map((s) => (
            <button
              key={s}
              className={`px-2.5 py-1 transition ${s === p.side ? "bg-ink text-paper" : "bg-paper"}`}
              onClick={() => s !== p.side && p.onFlipSide()}
              disabled={!p.ready || (s !== p.side && !p.hasOtherSide)}
              aria-pressed={s === p.side}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink text-sm transition ${p.showVideo ? "bg-ink text-paper" : "bg-paper"}`}
          onClick={() => p.onShowVideo(!p.showVideo)}
          title={p.showVideo ? "Hide video" : "Show video"}
          aria-pressed={p.showVideo}
        >
          📺
        </button>
      </div>

      {p.notice && <p className="pop-in mt-3 text-center text-sm font-semibold">{p.notice}</p>}

      {/* The YouTube embed: same DOM node either way so playback never restarts. */}
      <div className={p.showVideo ? "relative mt-4 aspect-video overflow-hidden rounded-xl border-2 border-ink bg-black" : "relative h-0"}>
        <div
          ref={p.hostRef}
          className={p.showVideo ? "absolute inset-0" : "pointer-events-none absolute left-0 top-0 h-[200px] w-[200px] opacity-0"}
          aria-hidden={!p.showVideo}
        />
      </div>

      <div className="speaker mt-4 h-3 rounded-full" aria-hidden />
    </div>
  );
}
