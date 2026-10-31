"use client";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION, RELEASE_NOTES } from "@/lib/constants";

/** ⓘ button with a small "about Tapie" card: a note from the maker and the version. */
export function AboutButton() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-paper font-type text-sm transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-0.5 active:scale-90"
        onClick={() => setOpen((o) => !o)}
        aria-label="About Tapie"
        aria-expanded={open}
        title="About Tapie"
      >
        i
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="About Tapie"
          className="pop-in absolute right-0 top-10 z-50 w-72 max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:w-auto rounded-2xl border-2 border-ink bg-paper p-4 text-left text-ink shadow-[4px_4px_0_var(--color-shadow)]"
        >
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-display text-lg">
              Tapie<span className="text-orange">.</span>
            </span>
            <span className="font-type text-xs text-ink/60">v{APP_VERSION}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            A weekend project that got out of hand. Tapie reads the mood of your songs and designs a cassette around them. No
            accounts, no ads, just tapes.
          </p>
          <p className="mt-3 text-right font-hand text-base">Built with ♡ by Shubh</p>
          <div className="mt-3 border-t-2 border-dashed border-ink/15 pt-3">
            <p className="font-type text-xs tracking-widest text-orange">WHAT'S NEW IN v{APP_VERSION.replace(/.0$/, "")}</p>
            <ul className="mt-1.5 space-y-1 text-xs text-ink/75">
              {RELEASE_NOTES.map((n) => (
                <li key={n} className="flex gap-1.5">
                  <span className="text-orange">•</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
