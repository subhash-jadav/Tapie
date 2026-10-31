"use client";
import { useState } from "react";
import { EMOJIS, FONTS, STICKER_KEYS, TEXT_STYLES, type FontKey, type StickerKey } from "@/lib/constants";
import type { Layer } from "@/lib/schema";
import { compressImage } from "@/lib/client";
import { Sticker } from "../Stickers";
import { Chips, ColorPicker, Field, FileButton, FontPicker, Slider } from "./ui";

// A layer before it has been placed on a surface.
export type NewLayer = Layer extends infer L ? (L extends Layer ? Omit<L, "id" | "x" | "y" | "rot"> : never) : never;

const STICKER_SIZE: Partial<Record<StickerKey, number>> = {
  mixtape: 190,
  rec: 120,
  rainbow: 120,
  "tape-pink": 150,
  "tape-mint": 150,
  "tape-yellow": 150,
  "tape-check": 150,
};

type Tab = "stickers" | "emoji" | "text" | "photos";

export function StickersPanel({ onAdd, onError }: { onAdd: (l: NewLayer) => void; onError: (m: string) => void }) {
  const [tab, setTab] = useState<Tab>("stickers");
  const [text, setText] = useState("");
  const [font, setFont] = useState<FontKey>("marker");
  const [color, setColor] = useState("#2b2118");
  const [style, setStyle] = useState<(typeof TEXT_STYLES)[number]>("plain");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  async function addImage(file: File, kind: "photo" | "image") {
    setBusy(true);
    try {
      const value = await compressImage(file, kind === "photo" ? 700 : 500, kind === "image");
      onAdd(kind === "photo" ? { type: "photo", value, caption: caption.slice(0, 40), size: 170 } : { type: "image", value, size: 160 });
      setCaption("");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Chips options={["stickers", "emoji", "text", "photos"] as const} value={tab} onChange={setTab} />
      </div>

      {tab === "stickers" && (
        <div className="grid grid-cols-5 gap-2">
          {STICKER_KEYS.map((k) => (
            <button
              key={k}
              className="grid aspect-square place-items-center rounded-xl border-2 border-ink/10 bg-field p-2 transition hover:scale-105 hover:border-ink"
              onClick={() => onAdd({ type: "sticker", value: k, size: STICKER_SIZE[k] ?? 90 })}
              title={k}
            >
              <Sticker name={k} width="100%" />
            </button>
          ))}
        </div>
      )}

      {tab === "emoji" && (
        <div className="grid grid-cols-6 gap-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              className="grid aspect-square place-items-center rounded-xl bg-field text-2xl transition hover:scale-110"
              onClick={() => onAdd({ type: "emoji", value: e, size: 64 })}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {tab === "text" && (
        <div>
          <Field label="Text" hint={`${text.length}/200`}>
            <textarea
              className="input min-h-20"
              value={text}
              maxLength={200}
              placeholder="for the long drive home ♡"
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <Field label="Style">
            <Chips options={TEXT_STYLES} value={style} onChange={setStyle} labels={{ tape: "highlight" }} />
          </Field>
          <Field label="Font">
            <FontPicker value={font} onChange={setFont} />
          </Field>
          <Field label="Color">
            <ColorPicker value={color} onChange={setColor} />
          </Field>
          <div className="mb-4 rounded-xl border-2 border-dashed border-ink/20 bg-field p-3 text-center" style={{ fontFamily: FONTS[font].css, color, fontSize: 24 }}>
            {text || "Preview"}
          </div>
          <button
            className="btn btn-primary w-full"
            disabled={!text.trim()}
            onClick={() => {
              onAdd({ type: "text", value: text.trim(), font, color, style, size: 36 });
              setText("");
            }}
          >
            Add text
          </button>
        </div>
      )}

      {tab === "photos" && (
        <div className="space-y-5">
          <div>
            <p className="label">Polaroid photo</p>
            <input
              className="input mb-2"
              placeholder="Caption (optional)"
              maxLength={40}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <FileButton className="btn btn-primary w-full" onFile={(f) => addImage(f, "photo")}>
              {busy ? "Processing…" : "📸 Upload photo"}
            </FileButton>
          </div>
          <div>
            <p className="label">Cut-out sticker</p>
            <p className="mb-2 text-xs text-ink/60">Upload a PNG with a transparent background to use it as a sticker.</p>
            <FileButton className="btn btn-ghost w-full" onFile={(f) => addImage(f, "image")}>
              ✂️ Upload sticker image
            </FileButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function LayerToolbar({
  layer,
  onChange,
  onDelete,
  onDuplicate,
  onOrder,
  onDone,
}: {
  layer: Layer;
  onChange: (p: Partial<Layer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOrder: (dir: 1 | -1) => void;
  onDone: () => void;
}) {
  const names: Record<Layer["type"], string> = { emoji: "Emoji", sticker: "Sticker", image: "Cut-out", photo: "Photo", text: "Text" };
  return (
    <div className="card pop-in mb-4 border-teal p-4" style={{ boxShadow: "5px 5px 0 #2a9d8f" }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-bold">Selected: {names[layer.type]}</span>
        <button className="btn btn-dark btn-sm" onClick={onDone}>
          Done
        </button>
      </div>

      {layer.type === "text" && (
        <>
          <textarea
            className="input mb-3 min-h-16"
            value={layer.value}
            maxLength={200}
            onChange={(e) => e.target.value && onChange({ value: e.target.value })}
          />
          <Field label="Style">
            <Chips options={TEXT_STYLES} value={layer.style} onChange={(style) => onChange({ style })} labels={{ tape: "highlight" }} />
          </Field>
          <Field label="Font">
            <FontPicker value={layer.font} onChange={(font) => onChange({ font })} />
          </Field>
          <Field label="Color">
            <ColorPicker value={layer.color} onChange={(color) => onChange({ color })} />
          </Field>
        </>
      )}
      {layer.type === "photo" && (
        <Field label="Caption">
          <input className="input" maxLength={40} value={layer.caption} onChange={(e) => onChange({ caption: e.target.value })} />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Size">
          <Slider value={layer.size} min={12} max={layer.type === "text" || layer.type === "emoji" ? 200 : 600} onChange={(size) => onChange({ size })} />
        </Field>
        <Field label="Rotate" hint={`${Math.round(layer.rot)}°`}>
          <Slider value={layer.rot} min={-180} max={180} onChange={(rot) => onChange({ rot })} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost btn-sm" onClick={() => onOrder(1)}>
          ⬆ Front
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onOrder(-1)}>
          ⬇ Back
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onDuplicate}>
          ⧉ Copy
        </button>
        <button className="btn btn-sm ml-auto bg-cherry text-paper" onClick={onDelete}>
          Delete
        </button>
      </div>
      <p className="mt-3 text-xs text-ink/50">Tip: drag to move · drag the ↻ handle to resize & rotate · Delete key removes</p>
    </div>
  );
}
