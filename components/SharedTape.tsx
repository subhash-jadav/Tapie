"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Cassette, Track } from "@/lib/schema";
import { SCENE_STYLES } from "@/lib/defaults";
import { formatTime, isIOS } from "@/lib/client";
import { useYouTubePlayer } from "@/lib/useYouTube";
import { FlipCard } from "./FlipCard";
import { SurfaceView } from "./Surfaces";
import { RetroPlayer } from "./RetroPlayer";
import { FONTS } from "@/lib/constants";
import { ThemeToggle } from "./ThemeToggle";
import { sfx } from "@/lib/sfx";
import { SiteFooter } from "@/components/SiteFooter";
import { ShareTapeButton } from "./ShareTapeButton";

// Viewer chose their own theme for shared tapes (otherwise the creator's look is shown).
const VIEWER_THEME_KEY = "tapie:share-viewer-theme";

function Equalizer() {
  return (
    <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="eq-bar h-full w-[3px] rounded-sm bg-current" style={{ animationDuration: `0.${7 + i}s` }} />
      ))}
    </span>
  );
}

export function SharedTape({ c }: { c: Cassette }) {
  const scene = SCENE_STYLES[c.scene];
  // By default the page shows the creator's backdrop; the viewer can switch to their own site theme.
  const [viewer, setViewer] = useState<{ dark: boolean } | null>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEWER_THEME_KEY) === "1") setViewer({ dark: document.documentElement.dataset.theme === "dark" });
    } catch {}
  }, []);
  function applyViewerTheme(isDark: boolean) {
    setViewer({ dark: isDark });
    try {
      localStorage.setItem(VIEWER_THEME_KEY, "1");
    } catch {}
  }
  function originalLook() {
    setViewer(null);
    try {
      localStorage.removeItem(VIEWER_THEME_KEY);
    } catch {}
  }
  const dark = viewer ? viewer.dark : scene.fg !== "#2b2118";
  const order = useMemo(() => [...c.tracks.filter((t) => t.side === "A"), ...c.tracks.filter((t) => t.side === "B")], [c.tracks]);
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [volume, setVolume] = useState(100);
  // Checked after mount so the server-rendered page and first client render match.
  const [ios, setIos] = useState(false);
  useEffect(() => setIos(isIOS()), []);
  const hostRef = useRef<HTMLDivElement>(null);

  const yt = useYouTubePlayer(hostRef, {
    onEnded: () => playIndex(idx + 1),
    onError: () => {
      setNotice(`"${order[idx]?.title}" can't be played here — skipping.`);
      playIndex(idx + 1);
    },
  });

  function playIndex(i: number) {
    if (i >= order.length) {
      setNotice("End of the tape ⏏ — press play to listen again.");
      setIdx(0);
      setStarted(false);
      return;
    }
    setIdx(i);
    setStarted(true);
    yt.load(order[i].videoId);
  }

  function flipCase() {
    sfx("whoosh");
    setCaseOpen((o) => !o);
  }

  function toggle() {
    if (!yt.ready) return;
    sfx("tape");
    setNotice(null);
    if (!started) playIndex(idx);
    else if (yt.playing) yt.pause();
    else yt.play();
  }

  // Some mobile browsers block starting playback from outside the video; hint to tap it.
  useEffect(() => {
    if (!started || yt.playing) return;
    const t = setTimeout(() => {
      if (yt.playing || yt.buffering) return;
      setShowVideo(true);
      setNotice("Tap the video once to start playing ▶");
    }, 3000);
    return () => clearTimeout(t);
  }, [started, idx, yt.playing, yt.buffering]);

  const current = order[idx];
  const side = current?.side ?? "A";
  const sideList = order.filter((t) => t.side === side);
  const posInSide = sideList.findIndex((t) => t.id === current?.id);
  const frac = yt.time.duration ? yt.time.current / yt.time.duration : 0;
  const progress = sideList.length ? Math.min(1, (Math.max(0, posInSide) + (started ? frac : 0)) / sideList.length) : 0;
  const otherSideFirst = order.findIndex((t) => t.side !== side);

  const panel = viewer ? "bg-paper/80 border-ink" : dark ? "bg-white/10 border-white/30" : "bg-paper/80 border-ink";

  return (
    <div
      className={`min-h-dvh transition-colors duration-300 ${viewer ? "" : "theme-classic"}`}
      style={viewer ? { color: "var(--color-ink)" } : { background: scene.bg, color: scene.fg }}
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4">
        <Link href="/" className="font-display text-2xl">
          Tapie<span className="text-orange">.</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {viewer && (
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-paper text-sm"
              onClick={originalLook}
              title="Original look (as the creator designed it)"
              aria-label="Original look"
            >
              ↺
            </button>
          )}
          {/* On the shared page these controls are scoped to the page chrome; the cassette art never changes. */}
          <div className={viewer ? "" : "theme-classic"}>
            <ThemeToggle onChange={applyViewerTheme} pageDark={dark} />
          </div>
          <ShareTapeButton id={c.id} title={c.title} />
          <Link href="/create" className="btn btn-ghost btn-sm whitespace-nowrap">
            <span className="max-sm:hidden">Make your own</span>
            <span className="sm:hidden">Make one</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <div className="pop-in mb-8 text-center">
          <p className="font-type text-sm tracking-widest opacity-70">{c.to ? `A MIXTAPE FOR ${c.to.toUpperCase()}` : "SOMEONE MADE YOU A MIXTAPE"}</p>
          <h1 className="text-4xl leading-tight sm:text-6xl" style={{ fontFamily: FONTS[c.cover.font].css }}>
            {c.title}
          </h1>
          {c.from && (
            <p className="mt-1 text-xl" style={{ fontFamily: FONTS[c.inside.font].css }}>
              from {c.from} ♡
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
          {/* The case */}
          <section>
            <button className="block w-full cursor-pointer text-left" onClick={flipCase} aria-label="Flip the case">
              <FlipCard flipped={caseOpen} front={<SurfaceView c={c} surface="cover" />} back={<SurfaceView c={c} surface="inside" />} />
            </button>
            <div className="mt-4 flex justify-center">
              <button className={`btn ${dark ? "btn-ghost" : "btn-dark"}`} onClick={flipCase}>
                ↻ {caseOpen ? "Close the case" : "Open the case"}
              </button>
            </div>
          </section>

          {/* The deck */}
          <section className={`rounded-3xl border-2 p-4 sm:p-6 ${panel}`}>
            <FlipCard
              flipped={side === "B"}
              front={<SurfaceView c={c} surface="tapeA" spinning={yt.playing} progress={side === "A" ? progress : 0} />}
              back={<SurfaceView c={c} surface="tapeB" spinning={yt.playing} progress={side === "B" ? progress : 0} />}
            />

            <div className="mt-6">
              <RetroPlayer
                dark={dark}
                ready={yt.ready}
                playing={yt.playing}
                buffering={yt.buffering}
                started={started}
                time={started ? yt.time : { current: 0, duration: current?.duration ?? 0 }}
                title={current?.title ?? ""}
                artist={current?.artist ?? ""}
                side={side}
                trackNo={posInSide + 1}
                trackCount={sideList.length}
                hasOtherSide={otherSideFirst >= 0}
                volume={volume}
                showVideo={showVideo}
                notice={notice}
                hostRef={hostRef}
                onToggle={toggle}
                onPrev={() => playIndex(Math.max(0, idx - 1))}
                onNext={() => playIndex(idx + 1)}
                onSeek={yt.seek}
                onFlipSide={() => {
                  if (otherSideFirst < 0) return;
                  sfx("whoosh");
                  playIndex(otherSideFirst);
                }}
                onVolume={(v) => {
                  setVolume(v);
                  yt.setVolume(v);
                }}
                onShowVideo={setShowVideo}
                muteOnly={ios}
              />
            </div>
          </section>
        </div>

        {/* Tracklist */}
        <section className={`mt-10 rounded-3xl border-2 p-4 sm:p-6 ${panel}`}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {(["A", "B"] as const).map((s) => {
              const list = order.filter((t) => t.side === s);
              if (!list.length) return null;
              return (
                <div key={s}>
                  <h2 className="mb-2 font-type tracking-widest">SIDE {s}</h2>
                  <ol className="space-y-1">
                    {list.map((t: Track, i) => {
                      const active = t.id === current?.id && started;
                      return (
                        <li key={t.id}>
                          <div
                            className={`group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition ${
                              active ? "bg-orange text-paper" : dark ? "hover:bg-white/10" : "hover:bg-ink/5"
                            }`}
                          >
                            <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => playIndex(order.indexOf(t))} disabled={!yt.ready}>
                              <span className="w-6 text-right text-sm opacity-60">{active && yt.playing ? <Equalizer /> : i + 1}</span>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" className="h-9 w-12 shrink-0 rounded-md object-cover" loading="lazy" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{t.title}</span>
                                <span className="block truncate text-xs opacity-70">{t.artist}</span>
                              </span>
                            </button>
                            <span className="text-xs opacity-60">{formatTime(t.duration)}</span>
                            <a
                              href={`https://www.youtube.com/watch?v=${t.videoId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm opacity-50 hover:opacity-100"
                              title="Open on YouTube"
                            >
                              ↗
                            </a>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <ShareTapeButton id={c.id} title={c.title} variant="cta" />
          <Link href="/create" className="btn btn-primary">
            Make a mixtape for someone →
          </Link>
        </div>
      </main>
      <SiteFooter className="-mt-6" />
    </div>
  );
}
