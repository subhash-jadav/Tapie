import type { ReactNode } from "react";
import type { StickerKey } from "@/lib/constants";

const INK = "#2b2118";
const S = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function washi(fill: string, extra?: ReactNode) {
  return (
    <g>
      <path d="M2 4 L6 0 L10 4 L14 0 L18 4 L22 0 L26 4 L30 0 L34 4 L38 0 L42 4 L46 0 L50 4 L54 0 L58 4 L62 0 L66 4 L70 0 L74 4 L78 0 L82 4 L86 0 L90 4 L94 0 L98 4 L98 26 L94 30 L90 26 L86 30 L82 26 L78 30 L74 26 L70 30 L66 26 L62 30 L58 26 L54 30 L50 26 L46 30 L42 26 L38 30 L34 26 L30 30 L26 26 L22 30 L18 26 L14 30 L10 26 L6 30 L2 26 Z" fill={fill} opacity={0.82} />
      {extra}
    </g>
  );
}

// Each sticker: [viewBox, artwork]. Square stickers use 0 0 100 100.
export const STICKERS: Record<StickerKey, [string, ReactNode]> = {
  heart: ["0 0 100 100", <path key="h" {...S} fill="#d1495b" d="M50 86 C14 62 6 42 14 26 C22 10 42 10 50 28 C58 10 78 10 86 26 C94 42 86 62 50 86 Z" />],
  star: ["0 0 100 100", <path key="s" {...S} fill="#f2b134" d="M50 8 L61 37 L92 38 L67 57 L76 88 L50 70 L24 88 L33 57 L8 38 L39 37 Z" />],
  sparkle: [
    "0 0 100 100",
    <g key="sp" {...S} fill="#fffaf0">
      <path d="M50 6 C54 36 64 46 94 50 C64 54 54 64 50 94 C46 64 36 54 6 50 C36 46 46 36 50 6 Z" />
      <path d="M82 10 C83 18 86 21 94 22 C86 23 83 26 82 34 C81 26 78 23 70 22 C78 21 81 18 82 10 Z" fill="#f7a1c4" strokeWidth={3} />
    </g>,
  ],
  bolt: ["0 0 100 100", <path key="b" {...S} fill="#f2b134" d="M58 4 L18 56 L46 56 L38 96 L82 40 L54 40 Z" />],
  flower: [
    "0 0 100 100",
    <g key="f" {...S}>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="50" cy="26" rx="16" ry="22" fill="#f7a1c4" transform={`rotate(${r} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="14" fill="#f2b134" />
    </g>,
  ],
  smiley: [
    "0 0 100 100",
    <g key="sm" {...S}>
      <circle cx="50" cy="50" r="42" fill="#f2b134" />
      <path d="M36 34 L36 46 M64 34 L64 46" />
      <path d="M28 58 C36 76 64 76 72 58" fill="none" />
    </g>,
  ],
  note: [
    "0 0 100 100",
    <g key="n" {...S} fill={INK}>
      <path d="M40 76 L40 18 L84 8 L84 66" fill="none" strokeWidth={7} />
      <path d="M40 18 L84 8 L84 24 L40 34 Z" />
      <ellipse cx="28" cy="78" rx="14" ry="11" fill="#d1495b" />
      <ellipse cx="72" cy="68" rx="14" ry="11" fill="#d1495b" />
    </g>,
  ],
  vinyl: [
    "0 0 100 100",
    <g key="v" {...S}>
      <circle cx="50" cy="50" r="44" fill="#111" />
      <circle cx="50" cy="50" r="32" fill="none" stroke="#444" strokeWidth={2} />
      <circle cx="50" cy="50" r="24" fill="none" stroke="#444" strokeWidth={2} />
      <circle cx="50" cy="50" r="15" fill="#e8742c" stroke={INK} strokeWidth={3} />
      <circle cx="50" cy="50" r="3" fill={INK} stroke="none" />
      <path d="M22 30 C28 22 36 17 44 15" stroke="#888" strokeWidth={3} fill="none" />
    </g>,
  ],
  headphones: [
    "0 0 100 100",
    <g key="hp" {...S}>
      <path d="M16 62 C16 20 84 20 84 62" fill="none" strokeWidth={8} />
      <rect x="8" y="54" width="22" height="34" rx="9" fill="#2a9d8f" />
      <rect x="70" y="54" width="22" height="34" rx="9" fill="#2a9d8f" />
    </g>,
  ],
  rainbow: [
    "0 0 100 70",
    <g key="r" fill="none" strokeLinecap="round">
      {["#d1495b", "#e8742c", "#f2b134", "#2a9d8f", "#3d5a80"].map((c, i) => (
        <path key={c} d={`M${10 + i * 7} 64 A${40 - i * 7} ${40 - i * 7} 0 0 1 ${90 - i * 7} 64`} stroke={c} strokeWidth={7} />
      ))}
    </g>,
  ],
  sun: [
    "0 0 100 100",
    <g key="su" {...S}>
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M50 4 L56 20 L44 20 Z" fill="#e8742c" transform={`rotate(${i * 30} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="26" fill="#f2b134" />
      <path d="M40 46 L40 48 M60 46 L60 48 M40 58 C46 64 54 64 60 58" fill="none" />
    </g>,
  ],
  moon: ["0 0 100 100", <path key="m" {...S} fill="#fffaf0" d="M66 8 C36 12 20 40 28 66 C36 90 66 98 88 80 C60 82 42 60 46 38 C49 24 56 14 66 8 Z" />],
  cherry: [
    "0 0 100 100",
    <g key="ch" {...S}>
      <path d="M30 66 C38 40 50 22 70 10 C70 30 72 46 74 62" fill="none" />
      <path d="M70 10 C80 8 90 14 92 22 C82 24 74 20 70 10 Z" fill="#2a9d8f" />
      <circle cx="28" cy="72" r="18" fill="#d1495b" />
      <circle cx="72" cy="72" r="18" fill="#d1495b" />
      <path d="M20 66 C22 62 26 60 30 60" stroke="#fff" strokeWidth={3} fill="none" />
    </g>,
  ],
  peace: [
    "0 0 100 100",
    <g key="p" {...S} fill="none" strokeWidth={8}>
      <circle cx="50" cy="50" r="40" fill="#9ad1c4" />
      <path d="M50 10 L50 90 M50 50 L22 78 M50 50 L78 78" />
    </g>,
  ],
  flame: [
    "0 0 100 100",
    <g key="fl" {...S}>
      <path d="M50 96 C22 96 12 74 20 54 C26 40 36 36 34 18 C50 26 60 40 58 54 C64 48 66 40 64 32 C80 44 88 62 82 76 C76 90 64 96 50 96 Z" fill="#e8742c" />
      <path d="M50 92 C38 92 32 82 36 72 C40 64 48 62 48 52 C58 60 64 70 62 80 C60 88 56 92 50 92 Z" fill="#f2b134" strokeWidth={3} />
    </g>,
  ],
  cloud: ["0 0 100 70", <path key="c" {...S} fill="#fffaf0" d="M24 62 C10 62 6 48 14 40 C12 26 28 18 38 26 C44 10 70 10 74 30 C88 28 96 42 90 52 C88 60 82 62 76 62 Z" />],
  crown: ["0 0 100 80", <path key="cr" {...S} fill="#f2b134" d="M10 70 L6 18 L30 40 L50 8 L70 40 L94 18 L90 70 Z" />],
  play: [
    "0 0 100 100",
    <g key="pl" {...S}>
      <circle cx="50" cy="50" r="42" fill="#2a9d8f" />
      <path d="M40 30 L72 50 L40 70 Z" fill="#fffaf0" />
    </g>,
  ],
  rec: [
    "0 0 140 60",
    <g key="re" {...S}>
      <rect x="4" y="4" width="132" height="52" rx="26" fill={INK} />
      <circle cx="32" cy="30" r="12" fill="#d1495b" stroke="none" />
      <text x="56" y="42" fill="#fffaf0" stroke="none" fontFamily="var(--font-bungee)" fontSize="30">REC</text>
    </g>,
  ],
  love: [
    "0 0 100 100",
    <g key="lv" {...S}>
      <circle cx="50" cy="50" r="44" fill="#f7a1c4" />
      <circle cx="50" cy="50" r="34" fill="none" strokeDasharray="4 6" strokeWidth={3} />
      <text x="50" y="60" textAnchor="middle" fill={INK} stroke="none" fontFamily="var(--font-shrikhand)" fontSize="28">love</text>
    </g>,
  ],
  mixtape: [
    "0 0 200 70",
    <g key="mx" {...S}>
      <path d="M8 14 L192 6 L186 60 L14 66 Z" fill="#d1495b" />
      <text x="100" y="48" textAnchor="middle" fill="#fffaf0" stroke="none" fontFamily="var(--font-shrikhand)" fontSize="36">mixtape</text>
    </g>,
  ],
  "tape-pink": ["0 0 100 30", washi("#f7a1c4")],
  "tape-mint": ["0 0 100 30", washi("#9ad1c4")],
  "tape-yellow": ["0 0 100 30", washi("#f2d16b")],
  "tape-check": [
    "0 0 100 30",
    washi(
      "#98c1d9",
      <g opacity={0.5} fill="#fffaf0">
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={2 + i * 8} y={i % 2 ? 15 : 4} width="4" height="11" />
        ))}
      </g>,
    ),
  ],
};

export function Sticker({ name, width }: { name: StickerKey; width: number | string }) {
  const [viewBox, art] = STICKERS[name] ?? STICKERS.star;
  return (
    <svg viewBox={viewBox} width={width} style={{ display: "block", overflow: "visible" }} aria-hidden>
      {art}
    </svg>
  );
}
