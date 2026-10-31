// Site themes: light (default), dark, or a random curated palette.
// Shared by the server (boot script in the layout) and the browser (ThemeToggle).

export type ThemeVars = {
  cream: string; // page background
  paper: string; // cards & panels
  ink: string; // text, borders
  field: string; // input fields
  shadow: string; // retro offset shadows
  dot: string; // background dot texture
  orange: string; // primary accent
  mustard: string; // secondary accent
};

export type Palette = { id: string; name: string; dark: boolean; vars: ThemeVars };

// Each palette is hand-tuned: muted, readable (ink on paper ≥ 7:1) and on-brand.
export const PALETTES: Palette[] = [
  {
    id: "sage",
    name: "Sage",
    dark: false,
    vars: { cream: "#e7ebdd", paper: "#f6f7ef", ink: "#2c3a2c", field: "#fdfdf8", shadow: "#2c3a2c", dot: "rgba(44,58,44,.07)", orange: "#5f8a52", mustard: "#c9ad5d" },
  },
  {
    id: "lavender",
    name: "Lavender haze",
    dark: false,
    vars: { cream: "#ebe6f2", paper: "#f9f7fc", ink: "#2d2540", field: "#ffffff", shadow: "#2d2540", dot: "rgba(45,37,64,.07)", orange: "#7d62b8", mustard: "#d99ab9" },
  },
  {
    id: "ocean",
    name: "Ocean ink",
    dark: false,
    vars: { cream: "#e1eaed", paper: "#f5f9fa", ink: "#14303b", field: "#ffffff", shadow: "#14303b", dot: "rgba(20,48,59,.07)", orange: "#2b7a90", mustard: "#e3b064" },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    dark: false,
    vars: { cream: "#f2e2d4", paper: "#fbf2ea", ink: "#3a2118", field: "#fffaf5", shadow: "#3a2118", dot: "rgba(58,33,24,.07)", orange: "#bd5a36", mustard: "#dd9f52" },
  },
  {
    id: "butter",
    name: "Butter & navy",
    dark: false,
    vars: { cream: "#f4ecca", paper: "#fffaeb", ink: "#1e2a45", field: "#ffffff", shadow: "#1e2a45", dot: "rgba(30,42,69,.07)", orange: "#2e4a8c", mustard: "#e0ae32" },
  },
  {
    id: "plum",
    name: "Midnight plum",
    dark: true,
    vars: { cream: "#1a131f", paper: "#251b2c", ink: "#efe2f1", field: "#2f2437", shadow: "#000000", dot: "rgba(239,226,241,.05)", orange: "#c77dbb", mustard: "#e3b56b" },
  },
  {
    id: "forest",
    name: "Forest night",
    dark: true,
    vars: { cream: "#111914", paper: "#1a251f", ink: "#e3eee5", field: "#22302a", shadow: "#000000", dot: "rgba(227,238,229,.05)", orange: "#7fb58a", mustard: "#d6b469" },
  },
  {
    id: "espresso",
    name: "Espresso",
    dark: true,
    vars: { cream: "#19130f", paper: "#241b16", ink: "#f1e5d6", field: "#2e241e", shadow: "#000000", dot: "rgba(241,229,214,.05)", orange: "#d98a4a", mustard: "#e5c078" },
  },
  {
    id: "denim",
    name: "Denim night",
    dark: true,
    vars: { cream: "#10161f", paper: "#18212d", ink: "#e4ebf3", field: "#1f2a38", shadow: "#000000", dot: "rgba(228,235,243,.05)", orange: "#7aa5d6", mustard: "#e0b467" },
  },
];

export type ThemeState = { mode: "light" } | { mode: "dark" } | { mode: "random"; palette: string };

export const THEME_KEY = "tapie:theme";
const VAR_NAMES = ["cream", "paper", "ink", "field", "shadow", "dot", "orange", "mustard"] as const;

/** Apply a theme to <html> (browser only). */
export function applyTheme(s: ThemeState) {
  const html = document.documentElement;
  for (const k of VAR_NAMES) html.style.removeProperty(`--color-${k}`);
  if (s.mode === "random") {
    const p = PALETTES.find((x) => x.id === s.palette) ?? PALETTES[0];
    html.dataset.theme = p.dark ? "dark" : "light";
    for (const k of VAR_NAMES) html.style.setProperty(`--color-${k}`, p.vars[k]);
  } else {
    html.dataset.theme = s.mode;
  }
}

export function saveTheme(s: ThemeState) {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(s));
  } catch {}
}

/**
 * Tiny inline script for <head>: applies the saved theme (or the system dark preference) before
 * the first paint, so there is no flash of the wrong theme. Built from the same palettes.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var h=document.documentElement,s=JSON.parse(localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)})||"null"),P=${JSON.stringify(Object.fromEntries(PALETTES.map((p) => [p.id, { d: p.dark, v: p.vars }])))};if(!s){h.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";return}if(s.mode==="random"&&P[s.palette]){var p=P[s.palette];h.dataset.theme=p.d?"dark":"light";for(var k in p.v)h.style.setProperty("--color-"+k,p.v[k])}else h.dataset.theme=s.mode==="dark"?"dark":"light"}catch(e){}})();`;
