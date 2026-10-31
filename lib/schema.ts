import { z } from "zod";
import {
  COVER_PATTERNS,
  FONT_KEYS,
  LABEL_PATTERNS,
  LIMITS,
  PAPERS,
  SCENES,
  SHELL_STYLES,
  STICKER_KEYS,
  TEXT_STYLES,
} from "./constants";
import { FAMILIES, VIBES } from "./vibes";

const Unit = z.number().min(0).max(1);

const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color");
const Font = z.enum(FONT_KEYS);
const LocalId = z.string().regex(/^[\w-]{1,32}$/);

// Images are compressed in the browser and sent as data URLs; once saved on Vercel they are
// replaced by their Vercel Blob URL.
export const DataImage = z
  .string()
  .max(1_500_000, "Image too large")
  .regex(
    /^(data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+|https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[\w./-]+)$/,
    "Invalid image",
  );

const layerBase = {
  id: LocalId,
  x: z.number().min(-400).max(1040),
  y: z.number().min(-400).max(800),
  size: z.number().min(8).max(1000),
  rot: z.number().min(-360).max(360),
};

export const LayerSchema = z.discriminatedUnion("type", [
  z.object({ ...layerBase, type: z.literal("emoji"), value: z.string().min(1).max(16) }),
  z.object({ ...layerBase, type: z.literal("sticker"), value: z.enum(STICKER_KEYS) }),
  z.object({ ...layerBase, type: z.literal("image"), value: DataImage }),
  z.object({
    ...layerBase,
    type: z.literal("photo"),
    value: DataImage,
    caption: z.string().max(40),
  }),
  z.object({
    ...layerBase,
    type: z.literal("text"),
    value: z.string().min(1).max(200),
    font: Font,
    color: Hex,
    style: z.enum(TEXT_STYLES),
  }),
]);

const Layers = z.array(LayerSchema).max(LIMITS.layersPerSurface);

export const TrackSchema = z.object({
  id: LocalId,
  videoId: z.string().regex(/^[\w-]{11}$/),
  title: z.string().trim().min(1).max(200),
  artist: z.string().max(120),
  duration: z.number().int().min(0).max(86_400).optional(),
  side: z.enum(["A", "B"]),
});

export const CassetteInputSchema = z
  .object({
    title: z.string().trim().min(1, "Give your mixtape a name").max(LIMITS.title),
    from: z.string().max(40),
    to: z.string().max(40),
    message: z.string().max(LIMITS.message),
    scene: z.enum(SCENES),
    vibe: z.enum(VIBES).optional(),
    mood: z
      .object({ energy: Unit, darkness: Unit, warmth: Unit, age: Unit, tenderness: Unit, family: z.enum(FAMILIES).optional(), year: z.number().int().min(1900).max(2100).optional() })
      .optional(),
    tape: z.object({
      shell: Hex,
      shellStyle: z.enum(SHELL_STYLES),
      label: Hex,
      labelPattern: z.enum(LABEL_PATTERNS),
      ink: Hex,
      font: Font,
      labelA: z.string().max(40),
      labelB: z.string().max(40),
    }),
    cover: z.object({
      bg: Hex,
      pattern: z.enum(COVER_PATTERNS),
      accent: Hex,
      photo: DataImage.nullable(),
      photoZoom: z.number().min(1).max(3),
      photoX: z.number().min(0).max(100),
      photoY: z.number().min(0).max(100),
      title: z.string().max(60),
      subtitle: z.string().max(60),
      font: Font,
      ink: Hex,
      spine: Hex,
    }),
    inside: z.object({
      paper: z.enum(PAPERS),
      ink: Hex,
      font: Font,
      showTracklist: z.boolean(),
    }),
    layers: z.object({ tapeA: Layers, tapeB: Layers, cover: Layers, inside: Layers }),
    tracks: z.array(TrackSchema).min(1, "Add at least one song").max(LIMITS.tracks),
  })
  .superRefine((c, ctx) => {
    const all = [...c.layers.tapeA, ...c.layers.tapeB, ...c.layers.cover, ...c.layers.inside];
    const images = all.filter((l) => l.type === "image" || l.type === "photo").length + (c.cover.photo ? 1 : 0);
    if (images > LIMITS.images) {
      ctx.addIssue({ code: "custom", message: `Too many photos (max ${LIMITS.images})` });
    }
  });

export type Layer = z.infer<typeof LayerSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type CassetteInput = z.infer<typeof CassetteInputSchema>;
export type Cassette = CassetteInput & { id: string; createdAt: string; updatedAt: string };

export function formatIssues(err: z.ZodError): string {
  const first = err.issues[0];
  if (!first) return "Invalid data";
  const where = first.path.length ? ` (${first.path.join(".")})` : "";
  return `${first.message}${where}`;
}
