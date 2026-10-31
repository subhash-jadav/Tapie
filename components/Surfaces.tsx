"use client";
import type { CSSProperties } from "react";
import { FONTS, H, W, type SurfaceKey } from "@/lib/constants";
import type { CassetteInput, Layer, Track } from "@/lib/schema";
import { coverBackground, labelBackground, PAPER_STYLES } from "@/lib/patterns";
import { fitFontSize, fitLine, formatTime } from "@/lib/client";
import { LayerCanvas } from "./Layers";
import { Stage } from "./Stage";

type C = CassetteInput;

// Pick black or cream text for a given background.
export function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#2b2118" : "#fffaf0";
}

const abs = (left: number, top: number, width: number, height: number): CSSProperties => ({
  position: "absolute",
  left,
  top,
  width,
  height,
});

// ---------------------------------------------------------------- Tape

function Reel({ cx, wound, spinning, reverse }: { cx: number; wound: number; spinning: boolean; reverse?: boolean }) {
  const r = 19 + 31 * wound;
  return (
    <g>
      <circle cx={cx} cy={52} r={r} fill="#4a2e1c" />
      <circle cx={cx} cy={52} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={r > 24 ? 6 : 0} strokeDasharray="1 3" />
      <g
        className="reel-spin"
        style={{
          transformOrigin: `${cx}px 52px`,
          animationPlayState: spinning ? "running" : "paused",
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        <circle cx={cx} cy={52} r={17} fill="#f4ead5" stroke="#2b2118" strokeWidth={2} />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <rect key={a} x={cx - 2.5} y={52 - 11} width={5} height={7} fill="#2b2118" rx={1} transform={`rotate(${a} ${cx} 52)`} />
        ))}
        <circle cx={cx} cy={52} r={4} fill="#2b2118" />
      </g>
    </g>
  );
}

export function TapeArt({
  c,
  side,
  progress = 0.35,
  spinning = false,
}: {
  c: C;
  side: "A" | "B";
  progress?: number;
  spinning?: boolean;
}) {
  const t = c.tape;
  const text = (side === "A" ? t.labelA : t.labelB) || c.title || "My Mixtape";
  const total = c.tracks.reduce((s, tr) => s + (tr.duration ?? 0), 0);
  const cType = total ? `C${Math.max(30, Math.ceil(total / 60 / 15) * 15)}` : "C60";
  const shellBg: CSSProperties =
    t.shellStyle === "clear"
      ? {
          background: `radial-gradient(circle at 30% 45%, rgba(255,255,255,.12) 0 60px, transparent 61px), radial-gradient(circle at 70% 45%, rgba(255,255,255,.12) 0 60px, transparent 61px), ${t.shell}99`,
          backdropFilter: "blur(1px)",
        }
      : t.shellStyle === "pearl"
        ? { background: `linear-gradient(125deg, ${t.shell} 0%, #ffffff66 35%, ${t.shell} 55%, #ffffff44 80%, ${t.shell} 100%), ${t.shell}` }
        : { background: t.shell };

  return (
    <div style={{ ...abs(0, 0, W, H) }}>
      <div
        style={{
          ...abs(0, 0, W, H),
          ...shellBg,
          borderRadius: 26,
          boxShadow:
            "inset 0 3px 0 rgba(255,255,255,.18), inset 0 -5px 0 rgba(0,0,0,.25), inset 0 0 0 2px rgba(0,0,0,.25), 0 22px 40px -16px rgba(0,0,0,.55)",
        }}
      />
      {[
        [22, 22],
        [618, 22],
        [22, 378],
        [618, 378],
      ].map(([x, y]) => (
        <div
          key={`${x}-${y}`}
          style={{
            ...abs(x - 8, y - 8, 16, 16),
            borderRadius: 8,
            background: "radial-gradient(circle at 35% 35%, #ddd, #777)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,.4)",
          }}
        >
          <div style={{ ...abs(3, 7, 10, 2), background: "#444", transform: "rotate(35deg)" }} />
        </div>
      ))}

      {/* Label */}
      <div
        style={{
          ...abs(36, 30, 568, 236),
          ...labelBackground(t.labelPattern, t.label),
          borderRadius: 14,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            ...abs(16, 12, 42, 42),
            borderRadius: 21,
            background: t.ink,
            color: t.label,
            display: "grid",
            placeItems: "center",
            fontFamily: FONTS.bungee.css,
            fontSize: 24,
          }}
        >
          {side}
        </div>
        <div
          style={{
            ...abs(70, 6, 478, 56),
            display: "flex",
            alignItems: "center",
            fontFamily: FONTS[t.font].css,
            fontSize: fitLine(text.length, t.font, 470, 16, 38),
            color: t.ink,
            whiteSpace: "nowrap",
            overflow: "hidden",
            borderBottom: `2px solid ${t.ink}33`,
          }}
        >
          {text}
        </div>

        {/* Window */}
        <div
          style={{
            ...abs(144, 92, 280, 104),
            borderRadius: 52,
            background: "#1c1714",
            boxShadow: "inset 0 0 0 5px rgba(0,0,0,.35), inset 0 6px 14px rgba(0,0,0,.6), 0 0 0 3px rgba(255,255,255,.35)",
            overflow: "hidden",
          }}
        >
          <svg width={280} height={104} viewBox="0 0 280 104">
            <Reel cx={70} wound={1 - progress} spinning={spinning} />
            <Reel cx={210} wound={progress} spinning={spinning} />
            <rect x={118} y={30} width={44} height={44} rx={4} fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.12)" />
          </svg>
          <div
            style={{
              ...abs(0, 0, 280, 104),
              background: "linear-gradient(160deg, rgba(255,255,255,.18) 0%, transparent 35%)",
            }}
          />
        </div>

        <div style={{ ...abs(18, 206, 200, 22), fontFamily: FONTS.typewriter.css, fontSize: 13, color: t.ink, opacity: 0.75 }}>
          TYPE I · NORMAL
        </div>
        <div
          style={{
            ...abs(370, 200, 180, 30),
            textAlign: "right",
            fontFamily: FONTS.bungee.css,
            fontSize: 24,
            color: t.ink,
            opacity: 0.85,
          }}
        >
          {cType}
        </div>
      </div>

      {/* Bottom trapezoid */}
      <svg style={abs(0, 0, W, H)} viewBox={`0 0 ${W} ${H}`}>
        <path d="M146 400 L176 292 L464 292 L494 400 Z" fill="rgba(0,0,0,.18)" stroke="rgba(0,0,0,.3)" strokeWidth={2} />
        <path d="M176 292 L464 292" stroke="rgba(255,255,255,.2)" strokeWidth={2} />
        <circle cx={214} cy={350} r={10} fill="#111" stroke="rgba(255,255,255,.2)" />
        <circle cx={426} cy={350} r={10} fill="#111" stroke="rgba(255,255,255,.2)" />
        <rect x={282} y={336} width={14} height={14} fill="#111" />
        <rect x={344} y={336} width={14} height={14} fill="#111" />
        <circle cx={320} cy={378} r={7} fill="#999" stroke="#555" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------- Cover

export function CoverArt({ c }: { c: C }) {
  const cv = c.cover;
  const title = cv.title || c.title || "My Mixtape";
  const spineInk = readableOn(cv.spine);
  return (
    <div style={{ ...abs(0, 0, W, H), borderRadius: 8, overflow: "hidden", ...coverBackground(cv) }}>
      {cv.photo && (
        <div style={{ ...abs(70, 0, W - 70, H), overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cv.photo}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${cv.photoX}% ${cv.photoY}%`,
              transform: `scale(${cv.photoZoom})`,
              transformOrigin: `${cv.photoX}% ${cv.photoY}%`,
            }}
          />
          <div style={{ ...abs(0, 180, W - 70, 220), background: "linear-gradient(to top, rgba(0,0,0,.5), transparent)" }} />
        </div>
      )}
      <div style={{ ...abs(0, 0, 70, H), background: cv.spine, boxShadow: "inset -6px 0 10px -6px rgba(0,0,0,.5)" }}>
        <div
          style={{
            ...abs(0, 16, 70, H - 32),
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: FONTS[cv.font].css,
            fontSize: fitLine(title.length, cv.font, 300, 16, 30),
            color: spineInk,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <span>{title}</span>
          <span style={{ fontFamily: FONTS.bungee.css, fontSize: 16, opacity: 0.8 }}>{c.from ? c.from.slice(0, 14) : "◉◉"}</span>
        </div>
      </div>
      <div style={{ ...abs(96, 230, 520, 150), display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div
          style={{
            fontFamily: FONTS[cv.font].css,
            fontSize: fitLine(title.length, cv.font, 520, 26, 64),
            lineHeight: 1.05,
            color: cv.ink,
            textShadow: cv.photo ? "0 2px 10px rgba(0,0,0,.35)" : "3px 3px 0 rgba(0,0,0,.18)",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        {cv.subtitle && (
          <div
            style={{
              fontFamily: FONTS.typewriter.css,
              fontSize: 20,
              color: cv.ink,
              marginTop: 6,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {cv.subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Inside (J-card unfolded)

function MiniTracklist({ tracks, font, ink }: { tracks: Track[]; font: C["inside"]["font"]; ink: string }) {
  const a = tracks.filter((t) => t.side === "A");
  const b = tracks.filter((t) => t.side === "B");
  const lines = tracks.length + (b.length ? 2 : 1);
  const size = Math.max(11, Math.min(19, 330 / (lines * 1.3)));
  const maxLines = Math.floor(330 / (size * 1.3));
  let budget = maxLines - (b.length ? 2 : 1);
  const showA = a.slice(0, Math.max(1, Math.min(a.length, b.length ? Math.ceil(budget / 2) : budget)));
  budget -= showA.length;
  const showB = b.slice(0, Math.max(0, budget));
  const hidden = tracks.length - showA.length - showB.length;
  const row = (t: Track, i: number) => (
    <div key={t.id} style={{ display: "flex", gap: 6, whiteSpace: "nowrap", overflow: "hidden", lineHeight: 1.3 }}>
      <span style={{ opacity: 0.6, minWidth: "1.4em" }}>{i + 1}.</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
    </div>
  );
  const head = (s: string) => (
    <div style={{ fontFamily: FONTS.bungee.css, fontSize: size * 0.85, letterSpacing: 1, opacity: 0.85, lineHeight: 1.3 }}>{s}</div>
  );
  return (
    <div style={{ fontFamily: FONTS[font].css, fontSize: size, color: ink }}>
      {head("SIDE A")}
      {showA.map(row)}
      {b.length > 0 && (
        <>
          {head("SIDE B")}
          {showB.map(row)}
        </>
      )}
      {hidden > 0 && <div style={{ opacity: 0.6, lineHeight: 1.3 }}>+ {hidden} more…</div>}
    </div>
  );
}

export function InsideArt({ c }: { c: C }) {
  const ins = c.inside;
  const paper = PAPER_STYLES[ins.paper];
  const msg = c.message || (c.to || c.from ? "" : "Write a little note here…");
  const wide = !ins.showTracklist;
  const boxW = wide ? 560 : 262;
  const msgSize = fitFontSize(msg.length, ins.font, boxW, 260, 13, 34);
  const total = c.tracks.reduce((s, t) => s + (t.duration ?? 0), 0);
  return (
    <div style={{ ...abs(0, 0, W, H), borderRadius: 8, overflow: "hidden", ...paper.style }}>
      <div style={{ ...abs(318, 0, 4, H), background: "linear-gradient(90deg, rgba(0,0,0,.12), rgba(255,255,255,.2))" }} />
      <div style={{ ...abs(44, 26, boxW, 348), color: ins.ink, fontFamily: FONTS[ins.font].css, display: "flex", flexDirection: "column" }}>
        {c.to && <div style={{ fontSize: Math.min(34, msgSize * 1.2), marginBottom: 6 }}>Dear {c.to},</div>}
        <div style={{ fontSize: msgSize, lineHeight: 1.3, whiteSpace: "pre-wrap", overflow: "hidden", flex: 1, opacity: c.message ? 1 : 0.5 }}>
          {msg}
        </div>
        {c.from && <div style={{ fontSize: Math.min(30, msgSize * 1.1), textAlign: "right" }}>— {c.from}</div>}
      </div>
      {ins.showTracklist && (
        <div style={{ ...abs(344, 26, 266, 348), overflow: "hidden" }}>
          <MiniTracklist tracks={c.tracks} font={ins.font} ink={ins.ink} />
          {total > 0 && (
            <div style={{ position: "absolute", right: 0, bottom: 0, fontFamily: FONTS.typewriter.css, fontSize: 13, color: ins.ink, opacity: 0.6 }}>
              total {formatTime(total)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Surface = art + stickers

export function SurfaceView({
  c,
  surface,
  editable,
  selectedId,
  onSelect,
  onLayerChange,
  progress,
  spinning,
  className,
}: {
  c: C;
  surface: SurfaceKey;
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onLayerChange?: (id: string, patch: Partial<Layer>) => void;
  progress?: number;
  spinning?: boolean;
  className?: string;
}) {
  return (
    <Stage className={className}>
      {surface === "tapeA" || surface === "tapeB" ? (
        <TapeArt c={c} side={surface === "tapeA" ? "A" : "B"} progress={progress} spinning={spinning} />
      ) : surface === "cover" ? (
        <CoverArt c={c} />
      ) : (
        <InsideArt c={c} />
      )}
      <div style={{ ...abs(0, 0, W, H), overflow: surface.startsWith("tape") ? "visible" : "hidden", borderRadius: 8 }}>
        <LayerCanvas
          layers={c.layers[surface]}
          editable={editable}
          selectedId={selectedId}
          onSelect={onSelect}
          onChange={onLayerChange}
        />
      </div>
      {surface === "cover" && (
        <div
          style={{
            ...abs(0, 0, W, H),
            borderRadius: 8,
            pointerEvents: "none",
            background: "linear-gradient(115deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.05) 28%, transparent 40%, transparent 70%, rgba(255,255,255,.1) 85%, transparent 100%)",
            boxShadow: "inset 0 0 0 3px rgba(255,255,255,.35), 0 20px 40px -18px rgba(0,0,0,.5)",
          }}
        />
      )}
    </Stage>
  );
}
