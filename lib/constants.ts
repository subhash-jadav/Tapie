// Shared between server (validation) and client (editor/rendering).

export const APP_VERSION = "1.3.1";

// Shown in the ⓘ About popup — keep it short and update it with every release.
export const RELEASE_NOTES = [
  "Release notes here & a little signature at the bottom",
  "Pick all your songs first, then start designing",
  "The vibe reads every song you picked",
  "A little note inside the case, matching the mood",
  "Smoother animations & soft sounds (🔊/🔇)",
];

export const W = 640;
export const H = 400;

export const LIMITS = {
  tracks: 100,
  layersPerSurface: 40,
  images: 16,
  message: 600,
  title: 60,
  bodyBytes: 8_000_000,
};

export const FONT_KEYS = [
  "marker",
  "caveat",
  "typewriter",
  "rocksalt",
  "shrikhand",
  "pixel",
  "gloria",
  "bungee",
  "pacifico",
  "serif",
  "classic",
] as const;
export type FontKey = (typeof FONT_KEYS)[number];

// `width` is a rough glyph-width factor used to auto-fit text into fixed boxes.
export const FONTS: Record<FontKey, { label: string; css: string; width: number }> = {
  marker: { label: "Marker", css: "var(--font-marker)", width: 1.3 },
  caveat: { label: "Handwritten", css: "var(--font-caveat)", width: 0.85 },
  typewriter: { label: "Typewriter", css: "var(--font-typewriter)", width: 1.2 },
  rocksalt: { label: "Scribble", css: "var(--font-rocksalt)", width: 1.6 },
  shrikhand: { label: "Groovy", css: "var(--font-shrikhand)", width: 1.25 },
  pixel: { label: "Pixel", css: "var(--font-pixel)", width: 0.9 },
  gloria: { label: "Doodle", css: "var(--font-gloria)", width: 1.2 },
  bungee: { label: "Block", css: "var(--font-bungee)", width: 1.5 },
  pacifico: { label: "Script", css: "var(--font-pacifico)", width: 1.2 },
  serif: { label: "Editorial", css: "var(--font-serif)", width: 1.05 },
  classic: { label: "Classic", css: "var(--font-classic)", width: 0.85 },
};

export const SHELL_STYLES = ["solid", "clear", "pearl"] as const;
export const LABEL_PATTERNS = ["plain", "lines", "stripes", "grid", "dots", "retro"] as const;
export const COVER_PATTERNS = ["plain", "grain", "stripes", "checker", "dots", "sunburst", "grid"] as const;
export const PAPERS = ["lined", "ivory", "kraft", "grid", "dots", "blush", "midnight"] as const;
export const SCENES = ["bedroom", "noir", "sunset", "night", "cork", "mint"] as const;
export const TEXT_STYLES = ["plain", "tape", "stamp", "bubble"] as const;

export const STICKER_KEYS = [
  "heart",
  "star",
  "sparkle",
  "bolt",
  "flower",
  "smiley",
  "note",
  "vinyl",
  "headphones",
  "rainbow",
  "sun",
  "moon",
  "cherry",
  "peace",
  "flame",
  "cloud",
  "crown",
  "play",
  "rec",
  "love",
  "mixtape",
  "tape-pink",
  "tape-mint",
  "tape-yellow",
  "tape-check",
] as const;
export type StickerKey = (typeof STICKER_KEYS)[number];

export const SURFACES = ["tapeA", "tapeB", "cover", "inside"] as const;
export type SurfaceKey = (typeof SURFACES)[number];

export const SURFACE_LABELS: Record<SurfaceKey, string> = {
  tapeA: "Tape · Side A",
  tapeB: "Tape · Side B",
  cover: "Case · Cover",
  inside: "Case · Inside",
};

// Compact labels for phone-width tab rows.
export const SURFACE_SHORT_LABELS: Record<SurfaceKey, string> = {
  tapeA: "Side A",
  tapeB: "Side B",
  cover: "Cover",
  inside: "Inside",
};

export const SWATCHES = [
  "#f4ead5",
  "#fffaf0",
  "#2b2118",
  "#111111",
  "#e8742c",
  "#f2b134",
  "#d1495b",
  "#f7a1c4",
  "#2a9d8f",
  "#9ad1c4",
  "#3d5a80",
  "#98c1d9",
  "#6b4226",
  "#c9a26b",
  "#7b5ea7",
  "#b8e04a",
];

export const EMOJIS = [
  "💖", "💘", "💕", "💌", "🫶", "🌹", "🌸", "🌼", "🌻", "🍒", "🍓", "🍑",
  "🌈", "⭐", "🌟", "✨", "⚡", "🔥", "💫", "🌙", "☀️", "🌊", "🌴", "🍄",
  "🎧", "🎵", "🎶", "🎸", "🎹", "🎤", "📼", "📻", "💿", "🪩", "🕺", "💃",
  "😎", "🥹", "😍", "🤘", "✌️", "👑", "🦋", "🐱", "🐶", "🐻", "👻", "💀",
  "🍕", "🍦", "🧃", "🍿", "🎉", "🎈", "📸", "🛹", "🖤", "💜", "💙", "💚",
];
