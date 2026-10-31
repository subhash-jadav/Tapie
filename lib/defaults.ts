import type { CassetteInput } from "./schema";

export function defaultCassette(): CassetteInput {
  return {
    title: "",
    from: "",
    to: "",
    message: "",
    scene: "bedroom",
    tape: {
      shell: "#2b2118",
      shellStyle: "solid",
      label: "#fffaf0",
      labelPattern: "retro",
      ink: "#2b2118",
      font: "marker",
      labelA: "",
      labelB: "",
    },
    cover: {
      bg: "#e8742c",
      pattern: "sunburst",
      accent: "#f2b134",
      photo: null,
      photoZoom: 1,
      photoX: 50,
      photoY: 50,
      title: "",
      subtitle: "",
      font: "shrikhand",
      ink: "#fffaf0",
      spine: "#2b2118",
    },
    inside: { paper: "lined", ink: "#2b2118", font: "caveat", showTracklist: true },
    layers: { tapeA: [], tapeB: [], cover: [], inside: [] },
    tracks: [],
  };
}

export const SCENE_STYLES: Record<CassetteInput["scene"], { label: string; bg: string; fg: string }> = {
  bedroom: {
    label: "Bedroom floor",
    bg: "radial-gradient(circle at 20% 10%, #fff6e2 0, transparent 40%), radial-gradient(circle at 90% 80%, #f6d9b0 0, transparent 45%), #f4ead5",
    fg: "#2b2118",
  },
  sunset: {
    label: "Sunset drive",
    bg: "linear-gradient(180deg, #ffcf70 0%, #f7925c 45%, #d1495b 80%, #7b3f6e 100%)",
    fg: "#2b2118",
  },
  night: {
    label: "Late night",
    bg: "radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 70% 20%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 40% 70%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 85% 60%, #fff 50%, transparent 51%), linear-gradient(180deg, #141833 0%, #2a2350 60%, #4a2c5c 100%)",
    fg: "#fffaf0",
  },
  cork: {
    label: "Corkboard",
    bg: "radial-gradient(rgba(90,50,20,.25) 1px, transparent 1.5px) 0 0/7px 7px, radial-gradient(rgba(255,230,190,.3) 1px, transparent 1.5px) 3px 4px/9px 9px, #b9844f",
    fg: "#2b2118",
  },
  mint: {
    label: "Mint diner",
    bg: "repeating-conic-gradient(#bfe6da 0 25%, #fffaf0 0 50%) 0 0/60px 60px",
    fg: "#2b2118",
  },
};

// A pre-decorated tape for the landing page.
export function demoCassette(): CassetteInput {
  const d = defaultCassette();
  return {
    ...d,
    title: "Summer '26",
    from: "Maya",
    tape: { ...d.tape, shell: "#d1495b", label: "#fffaf0", labelA: "summer '26 ☀", font: "marker" },
    cover: { ...d.cover, title: "Summer '26", subtitle: "windows down, volume up", bg: "#f2b134", accent: "#e8742c" },
    layers: {
      ...d.layers,
      tapeA: [
        { id: "d1", type: "sticker", value: "heart", x: 572, y: 118, size: 62, rot: 14 },
        { id: "d2", type: "sticker", value: "sparkle", x: 92, y: 140, size: 56, rot: -10 },
      ],
      cover: [{ id: "d3", type: "sticker", value: "sun", x: 540, y: 90, size: 110, rot: 8 }],
    },
    tracks: [
      { id: "t1", videoId: "dQw4w9WgXcQ", title: "Song one", artist: "", side: "A", duration: 212 },
      { id: "t2", videoId: "dQw4w9WgXcQ", title: "Song two", artist: "", side: "B", duration: 1600 },
    ],
  };
}
