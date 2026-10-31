"use client";
// Reads YouTube thumbnails in the browser (i.ytimg.com allows CORS) to get colors and build cover art.

import type { ThumbColors } from "./vibes";

const thumb = (id: string, q: "mqdefault" | "maxresdefault" = "mqdefault") => `https://i.ytimg.com/vi/${id}/${q}.jpg`;

function loadImage(src: string, ms = 5000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error("load failed"));
    };
    img.src = src;
  });
}

const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");

function hsl(r: number, g: number, b: number) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return { s, l };
}

const colorCache = new Map<string, Promise<ThumbColors | null>>();

/** Dominant, reasonably colorful colors across the first few song thumbnails. Null if they can't be read. */
export function thumbColors(videoIds: string[]): Promise<ThumbColors | null> {
  // Sample artwork evenly across the whole tape/playlist, not just its first songs.
  const n = Math.min(8, videoIds.length);
  const step = videoIds.length / Math.max(1, n);
  const ids = Array.from({ length: n }, (_, i) => videoIds[Math.floor(i * step)]);
  const key = ids.join(",");
  if (!ids.length) return Promise.resolve(null);
  if (!colorCache.has(key)) colorCache.set(key, computeColors(ids));
  return colorCache.get(key)!;
}

async function computeColors(ids: string[]): Promise<ThumbColors | null> {
  const imgs = (await Promise.allSettled(ids.map((id) => loadImage(thumb(id)))))
    .filter((r): r is PromiseFulfilledResult<HTMLImageElement> => r.status === "fulfilled")
    .map((r) => r.value);
  if (!imgs.length) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 22;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let lightSum = 0;
  let satSum = 0;
  let count = 0;

  try {
    for (const img of imgs) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < d.length; i += 4) {
        const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
        const { s, l } = hsl(r, g, b);
        lightSum += l;
        satSum += s;
        count++;
        if (l < 0.12 || l > 0.92) continue; // ignore near-black/white
        const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const bk = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
        bk.n++;
        bk.r += r;
        bk.g += g;
        bk.b += b;
        buckets.set(k, bk);
      }
    }
  } catch {
    return null; // canvas tainted (CORS) — fall back to presets
  }

  const ranked = [...buckets.values()]
    .map((b) => {
      const [r, g, bl] = [b.r / b.n, b.g / b.n, b.b / b.n];
      return { hex: toHex(r, g, bl), rgb: [r, g, bl], score: b.n * (0.35 + hsl(r, g, bl).s) };
    })
    .sort((a, b) => b.score - a.score);

  // Keep distinct colors only.
  const picked: typeof ranked = [];
  for (const c of ranked) {
    if (picked.every((p) => Math.hypot(p.rgb[0] - c.rgb[0], p.rgb[1] - c.rgb[1], p.rgb[2] - c.rgb[2]) > 60)) picked.push(c);
    if (picked.length === 5) break;
  }
  return { colors: picked.map((p) => p.hex), brightness: lightSum / count, saturation: satSum / count };
}

/** Cover art from song thumbnails: the first song's art, or a 2×2 collage. Returns a JPEG data URL. */
export async function songArtCover(videoIds: string[], mode: "single" | "collage"): Promise<string> {
  if (!videoIds.length) throw new Error("Add some songs first.");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  if (mode === "single") {
    const img = await loadImage(thumb(videoIds[0], "maxresdefault")).catch(() => loadImage(thumb(videoIds[0])));
    canvas.width = Math.min(1100, img.naturalWidth);
    canvas.height = Math.round((canvas.width * img.naturalHeight) / img.naturalWidth);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    const ids = Array.from({ length: 4 }, (_, i) => videoIds[i % videoIds.length]);
    const imgs = await Promise.all(ids.map((id) => loadImage(thumb(id))));
    canvas.width = 640;
    canvas.height = 360;
    imgs.forEach((img, i) => ctx.drawImage(img, (i % 2) * 320, Math.floor(i / 2) * 180, 320, 180));
  }
  return canvas.toDataURL("image/jpeg", 0.82);
}
