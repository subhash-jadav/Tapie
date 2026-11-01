"use client";
// Small motion helpers shared by the UI. All of them respect "reduce motion".

import { useLayoutEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";

export const reducedMotion = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const EASE_OUT = "cubic-bezier(.22, 1, .36, 1)"; // fast start, soft landing
export const EASE_SPRING = "cubic-bezier(.34, 1.56, .64, 1)"; // slight overshoot

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };

/**
 * Run a state update as a View Transition (crossfade by default). `kind` adds a class on <html>
 * while it runs so CSS can style that transition (e.g. the circular theme reveal).
 */
export function withTransition(update: () => void, kind?: string) {
  const doc = document as DocWithVT;
  if (!doc.startViewTransition || reducedMotion()) {
    update();
    return null;
  }
  if (kind) document.documentElement.classList.add(`vt-${kind}`);
  const t = doc.startViewTransition(() => flushSync(update));
  t.finished.finally(() => kind && document.documentElement.classList.remove(`vt-${kind}`));
  return t;
}

/** Theme change as a circle spreading out from the pressed button. */
export function revealFrom(el: HTMLElement | null, update: () => void) {
  const t = withTransition(update, "theme");
  if (!t || !el) return;
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: EASE_OUT, pseudoElement: "::view-transition-new(root)" },
    );
  });
}

/** Animate an element out (fade + shrink), then run `done`. */
export function animateOut(el: Element | null, done: () => void, opts: { collapse?: boolean; dx?: number } = {}) {
  if (!el || reducedMotion()) return done();
  const h = (el as HTMLElement).offsetHeight;
  const frames: Keyframe[] = opts.collapse
    ? [
        { opacity: 1, transform: "none", height: `${h}px` },
        { opacity: 0, transform: `translateX(${opts.dx ?? 18}px) scale(.97)`, height: "0px", marginTop: "0px", marginBottom: "0px", paddingTop: "0px", paddingBottom: "0px" },
      ]
    : [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(.6)" },
      ];
  if (opts.collapse) (el as HTMLElement).style.overflow = "hidden";
  el.animate(frames, { duration: opts.collapse ? 240 : 180, easing: EASE_OUT, fill: "forwards" }).finished.then(done, done);
}

/**
 * FLIP: when items inside `ref` move (reorder, move to another side), slide them from their old
 * position to the new one instead of jumping. Items are matched by their data-flip-id.
 */
export function useFlip(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
  const last = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const now = new Map<string, DOMRect>();
    root.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((el) => now.set(el.dataset.flipId!, el.getBoundingClientRect()));
    // Only glide when the same items were rearranged (adds/removes animate themselves).
    if (!reducedMotion() && now.size === last.current.size) {
      root.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((el) => {
        const prev = last.current.get(el.dataset.flipId!);
        const cur = now.get(el.dataset.flipId!)!;
        if (!prev) return;
        const dy = prev.top - cur.top;
        const dx = prev.left - cur.left;
        if (Math.abs(dy) < 1 && Math.abs(dx) < 1) return;
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 380, easing: EASE_SPRING });
      });
    }
    last.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Drag-to-reorder from a handle inside a [data-flip-id] item. Neighbours slide out of the way while
 * dragging; on release `onDrop(id, toIndex)` gets the item's new index among its siblings.
 * Works with mouse and touch (give the handle `touch-action: none`).
 */
export function startDrag(e: React.PointerEvent<HTMLElement>, onDrop: (id: string, toIndex: number) => void) {
  const handle = e.currentTarget;
  const item = handle.closest<HTMLElement>("[data-flip-id]");
  const list = item?.parentElement;
  if (!item || !list || e.button > 0) return;
  e.preventDefault();
  const items = [...list.children].filter((el): el is HTMLElement => el instanceof HTMLElement && !!el.dataset.flipId);
  const from = items.indexOf(item);
  const rects = items.map((el) => el.getBoundingClientRect());
  const gap = from < items.length - 1 ? rects[from + 1].top - rects[from].bottom : from > 0 ? rects[from].top - rects[from - 1].bottom : 0;
  const shift = rects[from].height + gap;
  const startY = e.clientY;
  let to = from;

  handle.setPointerCapture(e.pointerId);
  Object.assign(item.style, { position: "relative", zIndex: "20", boxShadow: "0 10px 24px rgb(0 0 0 / .2)" });
  for (const el of items) if (el !== item) el.style.transition = "transform 160ms ease";

  const move = (ev: PointerEvent) => {
    const dy = ev.clientY - startY;
    item.style.transform = `translateY(${dy}px) scale(1.02)`;
    const center = rects[from].top + rects[from].height / 2 + dy;
    to = rects.filter((r, i) => i !== from && r.top + r.height / 2 < center).length;
    items.forEach((el, i) => {
      if (i === from) return;
      const s = from < to && i > from && i <= to ? -shift : from > to && i >= to && i < from ? shift : 0;
      el.style.transform = s ? `translateY(${s}px)` : "";
    });
  };
  const end = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", end);
    handle.removeEventListener("pointercancel", end);
    const droppedTop = item.getBoundingClientRect().top;
    for (const el of items) Object.assign(el.style, { transition: "", transform: "", position: "", zIndex: "", boxShadow: "" });
    if (to !== from) onDrop(item.dataset.flipId!, to);
    // Neighbours are already where they belong, so drop the FLIP glide and just settle the dragged item.
    requestAnimationFrame(() => {
      for (const el of items) el.getAnimations().forEach((a) => a.cancel());
      const dy = droppedTop - item.getBoundingClientRect().top;
      if (Math.abs(dy) > 1 && !reducedMotion()) item.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 200, easing: EASE_OUT });
    });
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}
