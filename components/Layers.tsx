"use client";
import { useContext, useRef, type CSSProperties, type PointerEvent } from "react";
import { FONTS, H, W } from "@/lib/constants";
import type { Layer } from "@/lib/schema";
import { clamp } from "@/lib/client";
import { Sticker } from "./Stickers";
import { StageScale } from "./Stage";

export function LayerView({ layer }: { layer: Layer }) {
  switch (layer.type) {
    case "emoji":
      return <span style={{ fontSize: layer.size, lineHeight: 1, display: "block" }}>{layer.value}</span>;
    case "sticker":
      return <Sticker name={layer.value} width={layer.size} />;
    case "image":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={layer.value} alt="" draggable={false} style={{ width: layer.size, display: "block" }} />;
    case "photo": {
      const pad = layer.size * 0.06;
      return (
        <div
          style={{
            width: layer.size,
            padding: pad,
            paddingBottom: layer.caption ? layer.size * 0.2 : pad * 3,
            background: "#fffdf8",
            boxShadow: "0 6px 14px rgba(0,0,0,.25)",
            position: "relative",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={layer.value}
            alt=""
            draggable={false}
            style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
          />
          {layer.caption && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: layer.size * 0.035,
                textAlign: "center",
                fontFamily: FONTS.caveat.css,
                fontSize: layer.size * 0.12,
                color: "#2b2118",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {layer.caption}
            </div>
          )}
        </div>
      );
    }
    case "text": {
      const base: CSSProperties = {
        fontFamily: FONTS[layer.font].css,
        fontSize: layer.size,
        color: layer.color,
        whiteSpace: "pre",
        lineHeight: 1.1,
        textAlign: "center",
      };
      const styles: Record<typeof layer.style, CSSProperties> = {
        plain: {},
        tape: { background: "rgba(242,209,107,.85)", padding: ".15em .5em" },
        stamp: {
          border: ".08em solid currentColor",
          padding: ".1em .4em",
          borderRadius: ".15em",
          textTransform: "uppercase",
          letterSpacing: ".05em",
        },
        bubble: { background: "#fff", padding: ".3em .7em", borderRadius: "1em", boxShadow: "0 3px 8px rgba(0,0,0,.2)" },
      };
      return <div style={{ ...base, ...styles[layer.style] }}>{layer.value}</div>;
    }
  }
}

type Drag =
  | { mode: "move"; id: string; px: number; py: number; x: number; y: number }
  | { mode: "xf"; id: string; cx: number; cy: number; d0: number; a0: number; size: number; rot: number };

const normalizeDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

export function LayerCanvas({
  layers,
  editable = false,
  selectedId,
  onSelect,
  onChange,
}: {
  layers: Layer[];
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<Layer>) => void;
}) {
  const scale = useContext(StageScale);
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  function startMove(e: PointerEvent<HTMLDivElement>, l: Layer) {
    if (!editable) return;
    e.stopPropagation();
    onSelect?.(l.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode: "move", id: l.id, px: e.clientX, py: e.clientY, x: l.x, y: l.y };
  }

  function startTransform(e: PointerEvent<HTMLDivElement>, l: Layer) {
    e.stopPropagation();
    e.preventDefault();
    const rect = root.current!.getBoundingClientRect();
    const cx = rect.left + l.x * scale;
    const cy = rect.top + l.y * scale;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      mode: "xf",
      id: l.id,
      cx,
      cy,
      d0: Math.max(4, Math.hypot(e.clientX - cx, e.clientY - cy)),
      a0: Math.atan2(e.clientY - cy, e.clientX - cx),
      size: l.size,
      rot: l.rot,
    };
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "move") {
      onChange?.(d.id, {
        x: clamp(d.x + (e.clientX - d.px) / scale, -60, W + 60),
        y: clamp(d.y + (e.clientY - d.py) / scale, -60, H + 60),
      });
    } else {
      const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
      const ang = Math.atan2(e.clientY - d.cy, e.clientX - d.cx);
      onChange?.(d.id, {
        size: clamp((d.size * dist) / d.d0, 12, 900),
        rot: normalizeDeg(d.rot + ((ang - d.a0) * 180) / Math.PI),
      });
    }
  }

  const end = () => (drag.current = null);
  const handle = 26 / scale;

  return (
    <div
      ref={root}
      className="absolute inset-0"
      style={{ pointerEvents: editable ? "auto" : "none" }}
      onPointerDown={() => editable && onSelect?.(null)}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {layers.map((l) => {
        const selected = editable && l.id === selectedId;
        return (
          <div
            key={l.id}
            onPointerDown={(e) => startMove(e, l)}
            style={{
              position: "absolute",
              left: l.x,
              top: l.y,
              transform: `translate(-50%, -50%) rotate(${l.rot}deg)`,
              cursor: editable ? "grab" : undefined,
              touchAction: editable ? "none" : undefined,
              userSelect: "none",
              outline: selected ? `${2 / scale}px dashed #2a9d8f` : undefined,
              outlineOffset: 4 / scale,
            }}
          >
            <LayerView layer={l} />
            {selected && (
              <div
                title="Drag to resize & rotate"
                onPointerDown={(e) => startTransform(e, l)}
                style={{
                  position: "absolute",
                  right: -handle / 2 - 4 / scale,
                  bottom: -handle / 2 - 4 / scale,
                  width: handle,
                  height: handle,
                  borderRadius: "50%",
                  background: "#2a9d8f",
                  border: `${2 / scale}px solid #fff`,
                  boxShadow: "0 2px 6px rgba(0,0,0,.35)",
                  cursor: "nwse-resize",
                  touchAction: "none",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontSize: handle * 0.6,
                  lineHeight: 1,
                }}
              >
                ↻
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
