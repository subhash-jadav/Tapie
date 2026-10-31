"use client";
import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/client";
import { sfx } from "@/lib/sfx";

/**
 * Share a tape from its public page. Phones get the native share sheet; elsewhere a small menu offers
 * copy link and WhatsApp. Always shares the clean /c/<id> link, never an edit link.
 */
export function ShareTapeButton({ id, title, variant = "header" }: { id: string; title: string; variant?: "header" | "cta" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const url = () => `${window.location.origin}/c/${id}`;
  const text = `Listen to “${title}” 📼`;

  async function share() {
    // The native sheet only on touch devices: on desktop it is often a bare, confusing dialog.
    if ("share" in navigator && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, text, url: url() });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // closed the sheet
      }
    }
    setOpen((o) => !o);
  }

  async function copy() {
    if (await copyText(url())) {
      sfx("thunk");
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    }
  }

  return (
    <div ref={root} className="relative">
      {variant === "header" ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={share} aria-label="Share this tape" aria-expanded={open}>
          <span aria-hidden>↗</span>
          <span className="max-sm:hidden">Share</span>
        </button>
      ) : (
        <button type="button" className="btn btn-ghost" onClick={share} aria-expanded={open}>
          Share this tape ↗
        </button>
      )}
      {open && (
        <div
          role="menu"
          aria-label="Share this tape"
          className={`pop-in absolute z-50 w-60 rounded-2xl border-2 border-ink bg-paper p-2 text-left text-ink shadow-[4px_4px_0_var(--color-shadow)] ${
            variant === "header" ? "right-0 top-11" : "bottom-14 left-1/2 -translate-x-1/2"
          }`}
        >
          <button type="button" role="menuitem" className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-ink/5" onClick={copy}>
            {copied ? "Copied! ✓" : "🔗 Copy link"}
          </button>
          <a
            role="menuitem"
            className="block w-full rounded-xl px-3 py-2 text-sm hover:bg-ink/5"
            href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url()}`)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            💬 Send on WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
