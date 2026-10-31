import type { CSSProperties } from "react";
import type { CassetteInput } from "./schema";

// Fine film grain as an inline SVG noise texture.
export const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .22 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

type Tape = CassetteInput["tape"];
type Cover = CassetteInput["cover"];
type Inside = CassetteInput["inside"];

export function labelBackground(p: Tape["labelPattern"], base: string): CSSProperties {
  switch (p) {
    case "lines":
      return {
        backgroundColor: base,
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 27px, rgba(0,0,0,.16) 27px 29px)",
      };
    case "stripes":
      return {
        backgroundColor: base,
        backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 14px, rgba(0,0,0,.05) 14px 28px)",
      };
    case "grid":
      return {
        backgroundColor: base,
        backgroundImage:
          "linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      };
    case "dots":
      return {
        backgroundColor: base,
        backgroundImage: "radial-gradient(rgba(0,0,0,.18) 2px, transparent 2.5px)",
        backgroundSize: "18px 18px",
      };
    case "retro":
      return {
        backgroundColor: base,
        backgroundImage:
          "linear-gradient(180deg, transparent 0 62%, #f2b134 62% 70%, #e8742c 70% 78%, #d1495b 78% 86%, #6b4226 86% 100%)",
      };
    default:
      return { backgroundColor: base };
  }
}

export function coverBackground(c: Cover): CSSProperties {
  const { bg, accent } = c;
  switch (c.pattern) {
    case "grain":
      return {
        backgroundColor: bg,
        backgroundImage: `${GRAIN}, radial-gradient(ellipse at 55% 40%, transparent 35%, rgba(0,0,0,.38) 100%)`,
      };
    case "stripes":
      return { backgroundColor: bg, backgroundImage: `repeating-linear-gradient(90deg, ${accent} 0 26px, transparent 26px 52px)` };
    case "checker":
      return {
        backgroundColor: bg,
        backgroundImage: `repeating-conic-gradient(${accent} 0 25%, transparent 0 50%)`,
        backgroundSize: "56px 56px",
      };
    case "dots":
      return {
        backgroundColor: bg,
        backgroundImage: `radial-gradient(${accent} 7px, transparent 8px)`,
        backgroundSize: "36px 36px",
      };
    case "sunburst":
      return {
        backgroundColor: bg,
        backgroundImage: `repeating-conic-gradient(from 0deg at 60% 110%, ${accent} 0 6deg, transparent 6deg 12deg)`,
      };
    case "grid":
      return {
        backgroundColor: bg,
        backgroundImage: `linear-gradient(${accent} 2px, transparent 2px), linear-gradient(90deg, ${accent} 2px, transparent 2px)`,
        backgroundSize: "32px 32px",
      };
    default:
      return { backgroundColor: bg };
  }
}

export const PAPER_STYLES: Record<Inside["paper"], { label: string; style: CSSProperties; ink: string }> = {
  lined: {
    label: "Notebook",
    ink: "#2b2118",
    style: {
      backgroundColor: "#fbf6e9",
      backgroundImage:
        "linear-gradient(90deg, transparent 0 38px, rgba(209,73,91,.45) 38px 40px, transparent 40px), repeating-linear-gradient(to bottom, transparent 0 25px, rgba(61,90,128,.22) 25px 26px)",
    },
  },
  ivory: {
    label: "Ivory",
    ink: "#2b2118",
    style: { backgroundColor: "#efe8da", backgroundImage: `${GRAIN}, radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(80,60,40,.18) 100%)` },
  },
  kraft: {
    label: "Kraft",
    ink: "#2b2118",
    style: {
      backgroundColor: "#c9a26b",
      backgroundImage:
        "radial-gradient(rgba(80,50,20,.18) 1px, transparent 1.5px), radial-gradient(rgba(255,240,210,.25) 1px, transparent 1.5px)",
      backgroundSize: "6px 6px, 9px 9px",
      backgroundPosition: "0 0, 3px 4px",
    },
  },
  grid: {
    label: "Graph",
    ink: "#2b2118",
    style: {
      backgroundColor: "#ffffff",
      backgroundImage:
        "linear-gradient(rgba(42,157,143,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(42,157,143,.2) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
    },
  },
  dots: {
    label: "Dotted",
    ink: "#2b2118",
    style: {
      backgroundColor: "#fdfbf7",
      backgroundImage: "radial-gradient(rgba(0,0,0,.2) 1.2px, transparent 1.6px)",
      backgroundSize: "18px 18px",
    },
  },
  blush: { label: "Blush", ink: "#7a2340", style: { backgroundColor: "#f9d9d6" } },
  midnight: {
    label: "Midnight",
    ink: "#fffaf0",
    style: {
      backgroundColor: "#1d2033",
      backgroundImage: "radial-gradient(rgba(255,255,255,.5) 1px, transparent 1.5px)",
      backgroundSize: "34px 34px",
    },
  },
};
