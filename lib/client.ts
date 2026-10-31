"use client";
// Browser-only helpers: ids, image compression, "my tapes" list, formatting.

import { FONTS, type FontKey } from "./constants";

// crypto.randomUUID is unavailable on plain-http LAN addresses, so keep this simple.
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function formatTime(sec?: number) {
  if (!sec || !Number.isFinite(sec)) return "";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

// Pick a font size so `chars` characters fill a w×h box.
export function fitFontSize(chars: number, font: FontKey, w: number, h: number, min: number, max: number) {
  if (chars <= 0) return max;
  const k = 0.55 * FONTS[font].width * 1.35;
  return clamp(Math.sqrt((w * h) / (chars * k)) * 0.92, min, max);
}

// Fit a single line of text into a width.
export function fitLine(chars: number, font: FontKey, w: number, min: number, max: number) {
  if (chars <= 0) return max;
  return clamp(w / (chars * 0.55 * FONTS[font].width), min, max);
}

/** Resize + compress an image file into a data URL. Keeps transparency when `keepAlpha` is set. */
export async function compressImage(file: File, maxDim: number, keepAlpha = false): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > 25_000_000) throw new Error("That image is too large (max 25 MB).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't read that image."));
      i.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    if (!keepAlpha) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    if (keepAlpha) {
      const webp = canvas.toDataURL("image/webp", 0.85);
      return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
    }
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---- "My tapes": edit keys remembered in this browser ----

export type MyTape = { id: string; key: string; title: string; updatedAt: string };
const MINE = "mixtape:mine";

export function getMyTapes(): MyTape[] {
  try {
    const v = JSON.parse(localStorage.getItem(MINE) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function rememberTape(t: MyTape) {
  try {
    const list = getMyTapes().filter((x) => x.id !== t.id);
    localStorage.setItem(MINE, JSON.stringify([t, ...list].slice(0, 50)));
  } catch {}
}

export function forgetTape(id: string) {
  try {
    localStorage.setItem(MINE, JSON.stringify(getMyTapes().filter((x) => x.id !== id)));
  } catch {}
}

/** iPhone/iPad (any browser there is WebKit): pages can mute audio but not change its volume. */
export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
