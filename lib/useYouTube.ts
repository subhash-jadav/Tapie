"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<any> | null = null;

function loadApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

type Handlers = { onEnded?: () => void; onError?: (code: number) => void };

/** Embeds a YouTube player inside `hostRef` and exposes simple controls + state. */
export function useYouTubePlayer(hostRef: RefObject<HTMLDivElement | null>, handlers: Handlers) {
  const player = useRef<any>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    const el = document.createElement("div");
    host.appendChild(el);
    loadApi().then((YT) => {
      if (cancelled) return;
      player.current = new YT.Player(el, {
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => !cancelled && setReady(true),
          onStateChange: (e: any) => {
            setPlaying(e.data === 1);
            setBuffering(e.data === 3);
            if (e.data === 0) handlersRef.current.onEnded?.();
          },
          onError: (e: any) => handlersRef.current.onError?.(e.data),
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        player.current?.destroy();
      } catch {}
      player.current = null;
      host.innerHTML = "";
    };
  }, [hostRef]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      setTime({ current: p.getCurrentTime() || 0, duration: p.getDuration() || 0 });
    }, 500);
    return () => clearInterval(t);
  }, [playing]);

  return {
    ready,
    playing,
    buffering,
    time,
    load(videoId: string) {
      setTime({ current: 0, duration: 0 });
      player.current?.loadVideoById?.(videoId);
    },
    play: () => player.current?.playVideo?.(),
    pause: () => player.current?.pauseVideo?.(),
    seek: (s: number) => player.current?.seekTo?.(s, true),
    setVolume: (v: number) => {
      player.current?.setVolume?.(v);
      if (v > 0) player.current?.unMute?.();
    },
  };
}
