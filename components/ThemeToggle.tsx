"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { applyTheme, PALETTES, saveTheme, THEME_KEY, type ThemeState } from "@/lib/theme";
import { revealFrom } from "@/lib/motion";
import { isMuted, onMutedChange, setMuted, sfx } from "@/lib/sfx";
import { AboutButton } from "./AboutButton";

function readTheme(): ThemeState {
  try {
    const s = JSON.parse(localStorage.getItem(THEME_KEY) || "null");
    if (s?.mode === "random" || s?.mode === "dark" || s?.mode === "light") return s;
  } catch {}
  return { mode: document.documentElement.dataset.theme === "dark" ? "dark" : "light" };
}

/** ☾/☀ light–dark switch, 🎲 random curated palette and 🔊/🔇 sound switch. */
export function ThemeToggle({
  className = "",
  onChange,
  pageDark,
}: {
  className?: string;
  onChange?: (dark: boolean) => void;
  /** How the page currently looks, when it isn't simply the site theme (e.g. a shared tape's own backdrop). */
  pageDark?: boolean;
}) {
  const [theme, setTheme] = useState<ThemeState | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setTheme(readTheme());
    setMutedState(isMuted());
    return onMutedChange(setMutedState);
  }, []);

  const themeDark = theme ? (theme.mode === "random" ? !!PALETTES.find((p) => p.id === theme.palette)?.dark : theme.mode === "dark") : false;
  const isDark = pageDark ?? themeDark;
  const paletteName = theme?.mode === "random" ? PALETTES.find((p) => p.id === theme.palette)?.name : null;

  function set(next: ThemeState, e: MouseEvent<HTMLButtonElement>) {
    sfx("whoosh");
    // The new theme spreads out as a circle from the button that was pressed.
    revealFrom(e.currentTarget, () => {
      applyTheme(next);
      saveTheme(next);
      setTheme(next);
      onChange?.(next.mode === "random" ? !!PALETTES.find((p) => p.id === next.palette)?.dark : next.mode === "dark");
    });
  }

  function random(e: MouseEvent<HTMLButtonElement>) {
    const current = theme?.mode === "random" ? theme.palette : null;
    const options = PALETTES.filter((p) => p.id !== current);
    const p = options[Math.floor(Math.random() * options.length)];
    set({ mode: "random", palette: p.id }, e);
    setFlash(p.name);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1600);
  }

  const btn =
    "grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-paper text-sm transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-0.5 hover:rotate-[-8deg] active:scale-90";
  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      <AboutButton />
      <button
        type="button"
        className={btn}
        onClick={(e) => set({ mode: isDark ? "light" : "dark" }, e)}
        title={isDark ? "Light mode" : "Dark mode"}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span key={isDark ? "sun" : "moon"} className="pop-in">
          {isDark ? "☀" : "☾"}
        </span>
      </button>
      <button
        type="button"
        className={`${btn} ${theme?.mode === "random" ? "bg-ink text-paper" : ""}`}
        onClick={random}
        title={paletteName ? `Theme: ${paletteName} — tap for another` : "Random theme"}
        aria-label="Random theme"
      >
        🎲
      </button>
      <button
        type="button"
        className={`${btn} max-sm:hidden`}
        onClick={() => {
          setMuted(!muted);
          if (muted) setTimeout(() => sfx("pop"), 0);
        }}
        title={muted ? "Sounds off — tap to turn on" : "Sounds on — tap to mute"}
        aria-label={muted ? "Turn sounds on" : "Mute sounds"}
        aria-pressed={!muted}
      >
        <span key={muted ? "off" : "on"} className="pop-in text-xs">
          {muted ? "🔇" : "🔊"}
        </span>
      </button>
      {flash && (
        <span
          key={flash}
          className="pop-in pointer-events-none absolute right-0 top-10 z-50 whitespace-nowrap rounded-lg border-2 border-ink bg-paper px-2 py-1 text-xs font-semibold shadow-[2px_2px_0_var(--color-shadow)]"
        >
          {flash}
        </span>
      )}
    </div>
  );
}
