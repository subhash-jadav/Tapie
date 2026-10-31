// Dynamic "vibe" engine.
//
//  1. MOOD — every tape gets continuous mood scores (energy, darkness, warmth, age, tenderness) plus a
//     genre family, computed from real data about its songs (genre, release year, YouTube tags, title words)
//     and the tone of the song artwork. There are no artist lists: every song goes through the same path.
//  2. DESIGN — colors are generated from the songs' own artwork and shaped by the mood; fonts, patterns,
//     paper, backdrop, labels and the name are chosen by mood. Guard rails keep it muted and readable.
//
// The 9 vibe names are only archetypes: a label for the result, and a way for users to steer the mood.

import { FONTS, W, type FontKey, type StickerKey } from "./constants";
import { PAPER_STYLES } from "./patterns";
import type { CassetteInput, Layer, Track } from "./schema";

type C = CassetteInput;

// ---------------------------------------------------------------- mood

export const FAMILIES = ["hiphop", "rock", "electronic", "indian", "classic", "chill", "indie", "pop"] as const;
export type Family = (typeof FAMILIES)[number];

/** All dimensions are 0..1. */
export type Mood = {
  energy: number; // calm → loud
  darkness: number; // light → dark
  warmth: number; // cool → warm
  age: number; // new → old
  tenderness: number; // detached → tender/romantic
  family?: Family;
  /** Median release year of the songs, when known. */
  year?: number;
};

const DIMS = ["energy", "darkness", "warmth", "age", "tenderness"] as const;
type Dim = (typeof DIMS)[number];
type Delta = Partial<Record<Dim, number>>;

/** What we can learn about one song for free (see lib/songInfo.ts). */
export type SongSignals = { title: string; artist: string; genre?: string; year?: number; tags?: string[]; description?: string };

// Genre words (iTunes genres, YouTube tags) → how they move the mood, and which family they belong to.
const GENRES: [RegExp, Delta, Family?][] = [
  [/hip[- ]?hop|\brap\b|drill|\btrap\b|grime|desi hip/i, { energy: 0.6, darkness: 0.35 }, "hiphop"],
  [/metal|hard rock|punk|grunge|post-hardcore|\bemo\b/i, { energy: 0.9, darkness: 0.6, tenderness: -0.4 }, "rock"],
  [/indie rock|alternative rock|garage|shoegaze|post-punk/i, { energy: 0.25, darkness: 0.45 }, "rock"],
  [/\brock\b/i, { energy: 0.5, darkness: 0.2 }, "rock"],
  [/dance|edm|house\b|techno|electro(nic|nica)?\b|disco|k-?pop|club/i, { energy: 0.9, darkness: -0.3, warmth: 0.1 }, "electronic"],
  [/latin|urbano|reggaeton|afro|amapiano|baile|dancehall/i, { energy: 0.8, darkness: -0.2, warmth: 0.5 }, "electronic"],
  [/punjabi|bhangra/i, { energy: 0.7, warmth: 0.4 }, "indian"],
  [/lo-?fi|chillhop|ambient|downtempo|jazz|lounge|bossa|study/i, { energy: -0.7, darkness: 0.1, warmth: -0.1 }, "chill"],
  [/r&b|soul|neo-soul|trip[- ]hop/i, { energy: -0.2, darkness: 0.4, tenderness: 0.3 }],
  [/dream pop|sadcore|baroque pop|chamber pop|darkwave|gothic|synthwave|cinematic/i, { darkness: 0.8, energy: -0.2 }, "indie"],
  [/bedroom pop|indie pop|indie folk|folk|acoustic|singer\/songwriter|singer-songwriter/i, { energy: -0.4, darkness: -0.1, tenderness: 0.2 }, "indie"],
  [/\balternative\b|\bindie\b|hindie/i, { darkness: 0.25, energy: -0.1 }, "indie"],
  [/bollywood|filmi|indian pop|soundtrack|hindi|ghazal|sufi|qawwali/i, { tenderness: 0.5, warmth: 0.35 }, "indian"],
  [/oldies|\bclassic\b|vocal|big band|doo-?wop|motown|country|blues/i, { age: 0.5, warmth: 0.3 }, "classic"],
  [/ballad|love song|romantic/i, { tenderness: 0.8, energy: -0.3 }],
  [/\bsad\b|heartbreak|breakup|emotional|crying/i, { darkness: 0.5, tenderness: 0.2, energy: -0.4 }],
  [/\bpop\b/i, { energy: 0.2, darkness: -0.15 }, "pop"],
];

// General mood vocabulary (not artists) for titles, tags, search words and playlist names.
const WORDS: [string[], Delta][] = [
  [
    ["sad", "cry", "crying", "tears", "alone", "lonely", "broken", "heartbreak", "goodbye", "miss you", "hurt", "pain", "ghost", "lost", "judaai", "bewafa", "tanha", "alvida", "dard", "yaad", "दर्द", "तन्हा", "जुदाई", "बेवफा", "याद", "अलविदा"],
    { darkness: 0.6, energy: -0.3, tenderness: 0.2 },
  ],
  [["dark", "night", "midnight", "3am", "noir", "shadow", "black", "after dark", "villain"], { darkness: 0.6 }],
  [
    ["love", "lover", "ishq", "pyaar", "pyar", "prem", "dil", "jaan", "sanam", "mohabbat", "romantic", "romance", "kiss", "darling", "forever", "valentine", "wedding", "crush", "baby", "प्यार", "प्रेम", "इश्क", "दिल", "मोहब्बत", "सनम", "जान"],
    { tenderness: 0.7, warmth: 0.2 },
  ],
  [["party", "dance", "remix", "club", "edm", "dj", "banger", "bass", "nacho", "naach", "bhangra", "festival", "lit", "workout", "gym", "hype", "पार्टी", "नाच", "डांस"], { energy: 0.7, darkness: -0.2 }],
  [["lofi", "lo-fi", "chill", "slowed", "reverb", "sleep", "study", "relax", "calm", "acoustic", "unplugged", "lullaby", "sukoon", "सुकून"], { energy: -0.7 }],
  [["80s", "90s", "70s", "60s", "retro", "classic", "classics", "vintage", "oldies", "evergreen", "purane", "throwback", "remaster", "remastered", "पुराने", "सदाबहार"], { age: 0.7, warmth: 0.2 }],
  [["summer", "sun", "sunny", "golden", "fire", "gold"], { warmth: 0.5, darkness: -0.2 }],
  [["blue", "winter", "cold", "ocean", "ice", "rain", "snow"], { warmth: -0.5 }],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Word-ish boundaries that also work with non-latin scripts.
const term = (t: string) => new RegExp(`(^|[^a-z0-9])${escape(t)}($|[^a-z0-9])`, "i");
const WORD_MATCHERS = WORDS.map(([ws, d]) => [ws.map(term), d] as const);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const squash = (x: number) => 0.5 + 0.5 * Math.tanh(x);
const zero = (): Record<Dim, number> => ({ energy: 0, darkness: 0, warmth: 0, age: 0, tenderness: 0 });
const addDelta = (acc: Record<Dim, number>, d: Delta, k = 1) => {
  for (const [dim, v] of Object.entries(d) as [Dim, number][]) acc[dim] += v * k;
};
const wordHits = (acc: Record<Dim, number>, text: string, k: number, cap = 2) => {
  for (const [res, d] of WORD_MATCHERS) addDelta(acc, d, Math.min(cap, res.filter((r) => r.test(text)).length) * k);
};

/** Compute a tape's mood from whatever we know about its songs. Works without any network data too. */
export function moodFromSignals(songs: SongSignals[], context = "", art?: ThumbColors | null): Mood {
  const acc = zero();
  const families = new Map<Family, number>();
  const years: number[] = [];

  for (const s of songs) {
    const per = zero();
    // "lofi hip hop" is a lo-fi thing, not rap.
    const tagText = [...(s.tags ?? []), s.description ?? ""].join(" | ").replace(/lo-?fi hip[- ]?hop/gi, "lofi chillhop");
    // Stores file lo-fi under "Hip-Hop/Rap"; when the song says lo-fi, read the genre that way.
    const lofi = /lo-?fi|chillhop|study beats/i.test(`${s.title} ${s.artist} ${tagText}`);
    const genre = lofi ? (s.genre ?? "lofi").replace(/hip-?hop\/rap|hip[- ]?hop|\brap\b/gi, "lofi") : s.genre;
    for (const [re, d, fam] of GENRES) {
      const inGenre = !!genre && re.test(genre);
      const inTags = re.test(tagText);
      if (inGenre) addDelta(per, d, 1);
      else if (inTags) addDelta(per, d, 0.5);
      if (fam && (inGenre || inTags)) families.set(fam, (families.get(fam) ?? 0) + (inGenre ? 1 : 0.5));
    }
    wordHits(per, `${s.title} ${s.artist}`, 0.6);
    wordHits(per, tagText, 0.25, 1);
    if (s.year) years.push(s.year);
    for (const dim of DIMS) acc[dim] += per[dim] / Math.max(1, songs.length);
  }
  wordHits(acc, context, 0.8);

  if (art) {
    // YouTube artwork is darker than "neutral" on average, so centre on typical values.
    acc.darkness += (0.4 - art.brightness) * 1.5;
    acc.energy += (art.saturation - 0.3) * 1.4;
    acc.warmth += artWarmth(art) * 0.8;
  }

  const mood: Mood = {
    energy: squash(acc.energy),
    darkness: squash(acc.darkness),
    warmth: squash(acc.warmth),
    tenderness: squash(acc.tenderness),
    // Era comes straight from release years when we have them.
    // Era from release years, unless the words clearly say "old" (re-releases carry new dates).
    age: Math.max(years.length ? clamp01((2022 - median(years)) / 45) : 0.15, clamp01(acc.age * 0.9)),
  };
  const [fam, n] = [...families].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (fam && n >= Math.max(1, songs.length * 0.3)) mood.family = fam;
  if (years.length) mood.year = median(years);
  return mood;
}

/** Offline fallback: mood from titles/artists + artwork only. */
export function detectVibe(tracks: Pick<Track, "title" | "artist">[], context = "", art?: ThumbColors | null) {
  const mood = moodFromSignals(tracks, context, art);
  return { vibe: nearestVibe(mood), mood };
}

// ---------------------------------------------------------------- vibe archetypes

export const VIBES = ["noir", "chill", "romantic", "heartbreak", "dreamy", "party", "rock", "hiphop", "retro"] as const;
export type VibeKey = (typeof VIBES)[number];

export const VIBE_INFO: Record<VibeKey, { label: string; emoji: string; mood: Mood }> = {
  noir: { label: "Noir", emoji: "🖤", mood: { energy: 0.35, darkness: 0.88, warmth: 0.4, age: 0.3, tenderness: 0.45 } },
  chill: { label: "Lo-fi", emoji: "🌙", mood: { energy: 0.15, darkness: 0.55, warmth: 0.35, age: 0.2, tenderness: 0.35, family: "chill" } },
  romantic: { label: "Romantic", emoji: "🌹", mood: { energy: 0.3, darkness: 0.4, warmth: 0.7, age: 0.3, tenderness: 0.9 } },
  heartbreak: { label: "Heartbreak", emoji: "🥀", mood: { energy: 0.15, darkness: 0.75, warmth: 0.3, age: 0.25, tenderness: 0.6 } },
  dreamy: { label: "Dreamy", emoji: "☁️", mood: { energy: 0.3, darkness: 0.2, warmth: 0.5, age: 0.2, tenderness: 0.55 } },
  party: { label: "Party", emoji: "🪩", mood: { energy: 0.92, darkness: 0.3, warmth: 0.6, age: 0.1, tenderness: 0.2, family: "electronic" } },
  rock: { label: "Rock", emoji: "⚡", mood: { energy: 0.85, darkness: 0.7, warmth: 0.4, age: 0.35, tenderness: 0.15, family: "rock" } },
  hiphop: { label: "Hip-hop", emoji: "🎤", mood: { energy: 0.75, darkness: 0.62, warmth: 0.45, age: 0.15, tenderness: 0.2, family: "hiphop" } },
  retro: { label: "Retro", emoji: "📻", mood: { energy: 0.5, darkness: 0.3, warmth: 0.8, age: 0.9, tenderness: 0.45, family: "classic" } },
};

/** The archetype closest to a mood (only used as the label shown to the user). */
export function nearestVibe(m: Mood): VibeKey {
  let best: VibeKey = "dreamy";
  let bestD = Infinity;
  for (const v of VIBES) {
    const a = VIBE_INFO[v].mood;
    let d = DIMS.reduce((s, k) => s + (m[k] - a[k]) ** 2 * (k === "warmth" ? 0.4 : 1), 0);
    // Genre archetypes (Hip-hop, Rock, Party, Lo-fi) only fit when the songs are in that genre.
    if (a.family) d += a.family === m.family ? -0.12 : 0.15;
    if (d < bestD) [best, bestD] = [v, d];
  }
  return best;
}

/** A user picked a vibe: use its mood, but keep a little of the tape's own warmth and era. */
export function moodForVibe(v: VibeKey, current?: Mood): Mood {
  const a = VIBE_INFO[v].mood;
  if (!current) return { ...a };
  return { ...a, warmth: a.warmth * 0.7 + current.warmth * 0.3, age: a.age * 0.75 + current.age * 0.25 };
}

/** Short human description like "moody · mellow · warm". */
export function describeMood(m: Mood): string {
  const words: string[] = [];
  if (m.darkness > 0.62) words.push("moody");
  else if (m.darkness < 0.38) words.push("bright");
  if (m.energy > 0.62) words.push("energetic");
  else if (m.energy < 0.38) words.push("mellow");
  if (m.age > 0.55) words.push("vintage");
  if (m.tenderness > 0.62) words.push("tender");
  if (words.length < 3) words.push(m.warmth > 0.55 ? "warm" : m.warmth < 0.45 ? "cool" : "balanced");
  return words.slice(0, 3).join(" · ");
}

// ---------------------------------------------------------------- color math

export type ThumbColors = { colors: string[]; brightness: number; saturation: number };

type RGB = [number, number, number];
const hexToRgb = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = ([r, g, b]: RGB) => "#" + [r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0")).join("");
export const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hexToRgb(a), hexToRgb(b)];
  return rgbToHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
};

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = clamp01(s);
  l = clamp01(l);
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/** Warm (+) vs cool (−) feel of the artwork's main colors. */
function artWarmth(art: ThumbColors) {
  const vals = art.colors.slice(0, 4).map((c) => {
    const [h, s] = toHsl(c);
    if (s < 0.12) return 0;
    const warm = h < 70 || h > 320 ? 1 : h > 160 && h < 270 ? -1 : 0;
    return warm * s;
  });
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

const lum = (h: string) => {
  const c = hexToRgb(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** A text color in the background's own hue that is guaranteed readable. */
function inkFor(bg: string, hue: number, min = 4.5) {
  const light = hsl(hue, 0.25, 0.92);
  const dark = hsl(hue, 0.3, 0.12);
  const pick = contrast(bg, light) >= contrast(bg, dark) ? light : dark;
  return contrast(bg, pick) >= min ? pick : lum(bg) > 0.4 ? "#141010" : "#f4ede1";
}

// ---------------------------------------------------------------- design

// Small deterministic random so a shuffle seed always gives the same result.
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Choose the option whose mood score fits best (with a little randomness so shuffles vary). */
function choose<T extends string>(m: Mood, r: () => number, options: Partial<Record<T, (m: Mood) => number>>, jitter = 0.25): T {
  let best: T | null = null;
  let score = -Infinity;
  for (const [k, f] of Object.entries(options) as [T, (m: Mood) => number][]) {
    const s = f(m) + r() * jitter;
    if (s > score) [best, score] = [k, s];
  }
  return best!;
}

const fam = (m: Mood, f: Family, w = 1) => (m.family === f ? w : 0);

const COVER_FONTS: Partial<Record<FontKey, (m: Mood) => number>> = {
  serif: (m) => 0.5 * m.darkness + 0.3 * m.tenderness - 0.3 * m.energy + fam(m, "indie", 0.2) + fam(m, "indian", 0.2),
  classic: (m) => 0.7 * m.tenderness + 0.3 * m.darkness - 0.5 * m.energy + fam(m, "indian", 0.3),
  typewriter: (m) => 0.35 * m.age + 0.3 * (1 - m.energy) + 0.2 * m.darkness + fam(m, "chill", 0.2),
  bungee: (m) => 1.1 * m.energy - 0.3 * m.tenderness - 0.2 + fam(m, "electronic", 0.4) + fam(m, "hiphop", 0.3),
  shrikhand: (m) => 0.8 * m.age + 0.3 * m.warmth - 0.4 * m.darkness + fam(m, "classic", 0.2) - 0.1,
  marker: (m) => 0.6 * m.energy + 0.2 * m.darkness - 0.2 + fam(m, "hiphop", 0.5),
  rocksalt: (m) => 0.6 * m.energy + 0.5 * m.darkness - 0.6 * m.tenderness - 0.2 + fam(m, "rock", 0.5),
  pixel: (m) => 0.4 * (1 - m.energy) + 0.3 * (1 - m.warmth) - 0.25 + fam(m, "chill", 0.5),
};
const TAPE_FONTS: Partial<Record<FontKey, (m: Mood) => number>> = {
  classic: (m) => 0.6 * m.tenderness + 0.4 * m.darkness - 0.4 * m.energy,
  caveat: (m) => 0.4 * (1 - m.energy) + 0.3 * (1 - m.darkness),
  typewriter: (m) => 0.4 * m.age + 0.3 * (1 - m.energy) + fam(m, "chill", 0.2),
  marker: (m) => 0.6 * m.energy + fam(m, "hiphop", 0.4),
  rocksalt: (m) => 0.5 * m.energy + 0.4 * m.darkness - 0.5 * m.tenderness + fam(m, "rock", 0.4) - 0.1,
  pixel: (m) => 0.3 * (1 - m.energy) + fam(m, "chill", 0.4) - 0.15,
  bungee: (m) => m.energy - 0.25 + fam(m, "electronic", 0.3),
};

// Typeset labels, J-card style. {year} = this year, {era} = the songs' decade, {n} = song count.
const TAGS: [(m: Mood) => boolean, string[]][] = [
  [() => true, ["℗ {year}", "side a", "no. 01", "vol. 1", "{n} songs"]],
  [(m) => m.darkness > 0.6, ["after dark", "play at night", "for you, only"]],
  [(m) => m.tenderness > 0.6, ["for you", "xo", "with love", "♡"]],
  [(m) => m.energy > 0.65, ["loud", "no skips", "play it loud"]],
  [(m) => m.energy < 0.35, ["headphones on", "slow side", "quiet hours"]],
  [(m) => m.age > 0.5, ["stereo", "high fidelity", "{era}"]],
];

type Bucket = "dark" | "tender" | "energy" | "calm" | "old" | "bright";
const NAME_TEMPLATES: Record<Bucket, string[]> = {
  dark: ["{w} after dark", "the {w} tapes", "{w} at midnight", "{w}, in black & white"],
  tender: ["{w}, for you", "songs like {w}", "{w} & you", "love, {w}"],
  energy: ["{w} til dawn", "{w}: no skips", "louder than {w}", "the {w} sessions"],
  calm: ["{w} on repeat", "quiet {w}", "slow {w}", "{w} & rain"],
  old: ["{w}, rewound", "{w} on the radio", "the {w} years"],
  bright: ["{w} daydreams", "golden {w}", "{w}, softly"],
};
const NAME_PHRASES: Record<Bucket, string[]> = {
  dark: ["after dark", "midnight cinema", "velvet hours", "black & white film"],
  tender: ["you & me", "love notes", "letters to you", "slow dance"],
  energy: ["turn it up", "no skips", "friday night", "main character energy"],
  calm: ["quiet hours", "soft focus", "late night static", "slow mornings"],
  old: ["rewind time", "radio days", "golden oldies", "back in the day"],
  bright: ["daydreams", "golden hour", "cloud nine", "soft hours"],
};
// Short, sweet notes for the inside of the case. {song} = the first song on the tape.
const NOTES: Record<Bucket, string[]> = {
  dark: [
    "For the long drives home, when the city is asleep and it's just us and the radio. Start with “{song}”.",
    "Some songs only make sense after midnight. These are mine — and now they're yours.",
    "Turn the lights down, turn this up. Play it in order, no skipping.",
  ],
  tender: [
    "Every song on here made me think of you. Especially “{song}” — you'll know why.",
    "I couldn't find the words, so I found these songs instead. ♡",
    "A little tape for my favourite person. Play it when you miss me.",
  ],
  energy: [
    "Volume up, windows down. No skips allowed — that's the rule.",
    "Made for dancing badly in the kitchen. Start with “{song}” and don't stop.",
    "This tape has one job: to make your day louder. You're welcome.",
  ],
  calm: [
    "For slow mornings, rainy windows and staring at the ceiling. Headphones on.",
    "Put the kettle on, press play, breathe out. “{song}” first.",
    "Quiet songs for loud days. I hope they feel like a deep breath.",
  ],
  old: [
    "Some songs never get old. Neither do we. Press play and rewind time.",
    "Straight from the radio days — the good stuff, starting with “{song}”.",
    "Timeless songs for a timeless person. Turn it up like it's the old days.",
  ],
  bright: [
    "Sunshine in tape form. Play it on a good day, or to make one.",
    "Songs for staring at the sky. Start with “{song}” and float a little.",
    "A soft little tape for soft little days. Hope it makes you smile.",
  ],
};
const AUTO_NOTES = new Set(Object.values(NOTES).flat());

const SUBTITLE_ENDS: Record<Bucket, string[]> = {
  dark: ["the long drive home", "after midnight", "dark, slow nights"],
  tender: ["someone special", "you", "the one i think about"],
  energy: ["loud nights", "the pregame", "dancing badly"],
  calm: ["slow mornings", "rainy windows", "staring at the ceiling"],
  old: ["the good old days", "the radio days"],
  bright: ["soft days", "staring at the sky"],
};
const STOP = new Set(
  "the a an and or of to in on at for with from feat ft official video audio lyric lyrics music song songs remix version full live remastered remaster edit mix hd hq new my your you me i we our it is be this that what when love oh ooh yeah baby".split(
    " ",
  ),
);

function moodBucket(m: Mood): Bucket {
  const scores: [Bucket, number][] = [
    ["dark", m.darkness],
    ["tender", m.tenderness],
    ["energy", m.energy],
    ["calm", 1 - m.energy - 0.05],
    ["old", m.age + 0.05],
    ["bright", 1 - m.darkness - 0.1],
  ];
  return scores.sort((a, b) => b[1] - a[1])[0][0];
}

export const VIBE_LAYER_PREFIX = "vibe-";

export type DesignOptions = { replaceTitle: boolean; replaceSubtitle: boolean; replaceMessage?: boolean };

/** True when a note was written by the vibe engine (so a restyle may replace it). */
export const isAutoNote = (msg: string, firstSong = "") =>
  [...AUTO_NOTES].some((n) => n.replace("{song}", firstSong) === msg);

/**
 * Generate a full design from a mood and the songs' artwork. Keeps songs, message and the user's own
 * stickers; only "vibe-" layers are replaced, and the title/subtitle only when the caller allows it.
 */
export function designFromMood(c: C, mood: Mood, art: ThumbColors | null, seed: number, opts: DesignOptions): C {
  const r = rng(seed);
  const m = mood;
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];

  // ---- palette from the artwork
  // Music-video thumbnails are full of faces; skin tones (orange-brown, mid saturation) only win
  // when the artwork has no other real color.
  const isSkin = ([h, s, l]: [number, number, number]) => h >= 10 && h <= 45 && s < 0.6 && l > 0.2 && l < 0.8;
  const artHsl = (art?.colors ?? [])
    .map(toHsl)
    .filter(([, s]) => s > 0.08)
    .sort((a, b) => b[1] * (isSkin(b) ? 0.35 : 1) - a[1] * (isSkin(a) ? 0.35 : 1));
  const fallbackHue = m.warmth > 0.5 ? lerp(10, 40, r()) : lerp(200, 235, r());
  const primary = artHsl.length ? artHsl[seed % Math.min(2, artHsl.length)] : [fallbackHue, 0.35, 0.5];
  const secondary = artHsl.length > 1 ? artHsl[(seed + 1) % artHsl.length] : [primary[0] + 35, primary[1], primary[2]];
  // Old songs drift towards sepia.
  const sepia = (h: number) => (m.age > 0.5 ? lerp(h, 32, (m.age - 0.5) * 0.9) : h);
  const h1 = sepia(primary[0]);
  const h2 = sepia(secondary[0]);
  const s1 = Math.max(0.12, primary[1]);

  // Commit to a tone — muddy mid-greys are what make generated palettes look cheap.
  //   bold:  energetic & not dark → one confident color
  //   deep:  dark moods → rich, near-black version of the artwork's hue
  //   light: everything else → soft paper-like tint of the artwork's hue
  const bold = m.energy > 0.7 && m.darkness < 0.56;
  const deep = !bold && (m.darkness > 0.54 || (m.darkness > 0.46 && r() < 0.5));
  const tone = bold ? "bold" : deep ? "deep" : "light";
  const aged = 1 - 0.3 * m.age; // older → a little more faded

  const coverBg =
    tone === "bold"
      ? hsl(h1, Math.min(0.66, Math.max(0.45, s1)) * aged, lerp(0.48, 0.56, r()))
      : tone === "deep"
        ? hsl(h1, Math.min(0.5, Math.max(0.24, s1 * 0.8)) * aged, lerp(0.13, 0.2, r()))
        : hsl(h1, Math.min(0.38, Math.max(0.16, s1 * 0.55)) * aged, lerp(0.82, 0.88, r()));
  const coverAccent = mix(coverBg, hsl(h2, 0.4 * aged, tone === "light" ? 0.7 : tone === "deep" ? 0.26 : 0.42), 0.4);
  const spine =
    tone === "bold" ? hsl(h2, 0.2, 0.1) : tone === "deep" ? hsl(h2, 0.45 * aged, lerp(0.3, 0.38, r())) : hsl(h2, 0.38 * aged, lerp(0.38, 0.46, r()));
  const coverInk = c.cover.photo ? "#f4ede1" : inkFor(coverBg, h1);

  const shell =
    tone === "deep"
      ? hsl(h1, 0.12 + 0.08 * r(), lerp(0.08, 0.14, r()))
      : tone === "bold"
        ? hsl(h2, 0.15, 0.1)
        : m.tenderness > 0.6
          ? hsl(h1, 0.22 * aged, lerp(0.76, 0.84, r()))
          : hsl(h2, 0.3 * aged, lerp(0.34, 0.44, r()));
  const label = tone === "bold" && r() < 0.5 ? hsl(h1, 0.55, 0.62) : hsl(lerp(40, h1, 0.3), 0.2 + 0.12 * m.age, lerp(0.92, 0.86, m.age));
  const tapeInk = inkFor(label, h1);

  // ---- type, texture, paper, backdrop
  const coverFont = choose(m, r, COVER_FONTS);
  const tapeFont = choose(m, r, TAPE_FONTS);
  const coverPattern = choose<C["cover"]["pattern"]>(m, r, {
    grain: (x) => 0.55 + 0.3 * x.darkness - 0.2 * x.energy,
    plain: () => 0.3,
    sunburst: (x) => 0.9 * x.age + 0.3 * x.warmth - 0.5 * x.darkness - 0.25,
    stripes: (x) => 0.5 * x.age + 0.4 * x.energy - 0.35,
    checker: (x) => x.energy - 0.45 - 0.3 * x.tenderness,
    dots: (x) => 0.4 * x.tenderness + 0.3 * (1 - x.darkness) - 0.45,
    grid: (x) => 0.3 * (1 - x.energy) + 0.3 * (1 - x.warmth) - 0.35 + fam(x, "chill", 0.2),
  });
  const labelPattern = choose<C["tape"]["labelPattern"]>(m, r, {
    plain: () => 0.45,
    lines: (x) => 0.3 + 0.3 * x.darkness,
    retro: (x) => x.age - 0.1,
    stripes: (x) => x.energy - 0.35,
    dots: (x) => 0.3 * x.tenderness + 0.2 * (1 - x.darkness) - 0.2,
    grid: (x) => 0.25 * (1 - x.energy) - 0.1,
  });
  const shellStyle = choose<C["tape"]["shellStyle"]>(m, r, {
    solid: () => 0.5,
    clear: (x) => 0.4 * (1 - x.warmth) + 0.2 * (1 - x.energy),
    pearl: (x) => 0.5 * x.tenderness + 0.2 * (1 - x.darkness) - 0.1,
  });
  const paper = choose<C["inside"]["paper"]>(m, r, {
    ivory: () => 0.5,
    midnight: (x) => x.darkness - 0.25,
    kraft: (x) => 0.7 * x.age + 0.2 * x.energy - 0.1,
    lined: (x) => 0.3 + 0.2 * (1 - x.energy) - 0.1,
    grid: (x) => 0.3 * (1 - x.warmth) + 0.2 * (1 - x.energy) - 0.15,
    dots: (x) => 0.3 * (1 - x.darkness) - 0.1,
    blush: (x) => 0.6 * x.tenderness + 0.2 * (1 - x.darkness) - 0.45,
  });
  const insideFont: FontKey = m.energy > 0.7 ? "marker" : m.tenderness > 0.6 ? "classic" : m.age > 0.55 || m.darkness > 0.6 ? "typewriter" : "caveat";
  const scene: C["scene"] = m.darkness > 0.6 ? "noir" : m.darkness > 0.48 ? "night" : bold && m.age < 0.5 ? "sunset" : "bedroom";

  // ---- labels (typeset, not emoji)
  const decade = Math.floor((m.year ?? new Date().getFullYear() - Math.round(m.age * 45)) / 10) * 10;
  const fill = (t: string) =>
    t
      .replace("{year}", String(new Date().getFullYear()))
      .replace("{era}", `'${String(decade).slice(2)}s`)
      .replace("{n} songs", c.tracks.length === 1 ? "1 song" : `${c.tracks.length} songs`);
  const pool = TAGS.flatMap(([ok, ts]) => (ok(m) ? ts : [])).sort(() => r() - 0.5).map(fill);
  const tagFont: FontKey = m.energy > 0.75 ? "bungee" : m.tenderness > 0.65 && m.darkness < 0.6 ? "classic" : "typewriter";
  const width = (s: string, size: number) => s.length * size * 0.6 * FONTS[tagFont].width;
  const text = (key: string, value: string, x: number, y: number, size: number, color: string, style: "plain" | "stamp" = "plain"): Layer => ({
    id: `${VIBE_LAYER_PREFIX}${key}`,
    type: "text",
    value,
    font: tagFont,
    color,
    style,
    size,
    x,
    y,
    rot: 0,
  });
  const [t1, t2] = pool;
  const coverLayers: Layer[] = [
    text("cover-l", t1, 92 + width(t1, 15) / 2, 34, 15, coverInk),
    text("cover-r", t2, W - 26 - width(t2, 15) / 2, 34, 15, coverInk),
  ];
  const short = pool.find((t) => t.length <= 9 && t !== t1 && t !== t2) ?? "side a";
  const tapeLayers: Layer[] = [text("tape", short, 566, 334, 14, inkFor(shell, h1, 3), r() < 0.5 ? "stamp" : "plain")];

  // At most one quiet sticker, only where it suits the mood.
  const sticker: StickerKey | null =
    m.age > 0.6 ? pick<StickerKey>(["vinyl", "sun"]) : m.energy > 0.72 ? pick<StickerKey>(["bolt", "star"]) : m.energy < 0.3 && m.darkness > 0.45 ? "moon" : null;
  if (sticker && r() < 0.6) coverLayers.push({ id: `${VIBE_LAYER_PREFIX}cover-s`, type: "sticker", value: sticker, size: 58, x: 572, y: 118, rot: (r() - 0.5) * 16 });

  // ---- name + subtitle from the songs' own words
  const bucket = moodBucket(m);
  const words = c.tracks.flatMap((t) => t.title.toLowerCase().match(/\p{L}{4,12}/gu) ?? []).filter((w) => !STOP.has(w));
  const name = words.length && r() < 0.55 ? pick(NAME_TEMPLATES[bucket]).replace("{w}", pick(words)) : pick(NAME_PHRASES[bucket]);
  const n = c.tracks.length;
  const subtitle = `${n} song${n === 1 ? "" : "s"} for ${pick(SUBTITLE_ENDS[bucket])}`;
  const first = c.tracks[0]?.title.slice(0, 40) ?? "";
  const note = pick(NOTES[bucket].filter((x) => first || !x.includes("{song}"))).replace("{song}", first);

  const keep = (ls: Layer[]) => ls.filter((l) => !l.id.startsWith(VIBE_LAYER_PREFIX));
  return {
    ...c,
    vibe: nearestVibe(m),
    mood: { ...m },
    title: opts.replaceTitle ? name.slice(0, 60) : c.title,
    // Only fill an empty (or previously auto-written) note — never the user's own words.
    message: opts.replaceMessage ? note.slice(0, 600) : c.message,
    scene,
    tape: { ...c.tape, shell, shellStyle, label, labelPattern, ink: tapeInk, font: tapeFont },
    cover: {
      ...c.cover,
      bg: coverBg,
      accent: coverAccent,
      pattern: coverPattern,
      ink: coverInk,
      spine,
      font: coverFont,
      subtitle: opts.replaceSubtitle ? subtitle.slice(0, 60) : c.cover.subtitle,
    },
    inside: { ...c.inside, paper, font: insideFont, ink: PAPER_STYLES[paper].ink },
    layers: {
      tapeA: [...keep(c.layers.tapeA), ...tapeLayers],
      tapeB: keep(c.layers.tapeB),
      cover: [...keep(c.layers.cover), ...coverLayers],
      inside: keep(c.layers.inside),
    },
  };
}

/** Back to the plain starting design (keeps songs, text and the user's own stickers). */
export function plainDesign(c: C, base: C, opts: DesignOptions): C {
  const keep = (ls: Layer[]) => ls.filter((l) => !l.id.startsWith(VIBE_LAYER_PREFIX));
  return {
    ...c,
    vibe: undefined,
    mood: undefined,
    title: opts.replaceTitle ? "" : c.title,
    message: opts.replaceMessage ? "" : c.message,
    scene: base.scene,
    tape: { ...base.tape, labelA: c.tape.labelA, labelB: c.tape.labelB },
    cover: {
      ...base.cover,
      photo: c.cover.photo,
      photoZoom: c.cover.photoZoom,
      photoX: c.cover.photoX,
      photoY: c.cover.photoY,
      title: c.cover.title,
      subtitle: opts.replaceSubtitle ? "" : c.cover.subtitle,
    },
    inside: { ...base.inside, showTracklist: c.inside.showTracklist },
    layers: { tapeA: keep(c.layers.tapeA), tapeB: keep(c.layers.tapeB), cover: keep(c.layers.cover), inside: keep(c.layers.inside) },
  };
}
