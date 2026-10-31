"use client";
import { useEffect, useState } from "react";
import { applyTheme, PALETTES, saveTheme, THEME_KEY, type ThemeState } from "@/lib/theme";

function readTheme(): ThemeState {
  try {
    const s = JSON.parse(localStorage.getItem(THEME_KEY) || "null");
    if (s?.mode === "random" || s?.mode === "dark" || s?.mode === "light") return s;
  } catch {}
  return { mode: document.documentElement.dataset.theme === "dark" ? "dark" : "light" };
}

/** ☀/🌙 light–dark switch + 🎲 random curated palette. */
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

  useEffect(() => setTheme(readTheme()), []);

  const themeDark = theme ? (theme.mode === "random" ? !!PALETTES.find((p) => p.id === theme.palette)?.dark : theme.mode === "dark") : false;
  const isDark = pageDark ?? themeDark;
  const paletteName = theme?.mode === "random" ? PALETTES.find((p) => p.id === theme.palette)?.name : null;

  function set(next: ThemeState) {
    applyTheme(next);
    saveTheme(next);
    setTheme(next);
    onChange?.(next.mode === "random" ? !!PALETTES.find((p) => p.id === next.palette)?.dark : next.mode === "dark");
  }

  function random() {
    const current = theme?.mode === "random" ? theme.palette : null;
    const options = PALETTES.filter((p) => p.id !== current);
    const p = options[Math.floor(Math.random() * options.length)];
    set({ mode: "random", palette: p.id });
    setFlash(p.name);
    setTimeout(() => setFlash(null), 1600);
  }

  const btn =
    "grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-paper text-sm transition hover:-translate-y-px active:translate-y-px";
  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        className={btn}
        onClick={() => set({ mode: isDark ? "light" : "dark" })}
        title={isDark ? "Light mode" : "Dark mode"}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? "☀" : "☾"}
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
      {flash && (
        <span className="pop-in pointer-events-none absolute right-0 top-10 z-50 whitespace-nowrap rounded-lg border-2 border-ink bg-paper px-2 py-1 text-xs font-semibold shadow-[2px_2px_0_var(--color-shadow)]">
          {flash}
        </span>
      )}
    </div>
  );
}
