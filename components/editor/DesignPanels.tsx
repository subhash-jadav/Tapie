"use client";
import { useState } from "react";
import { COVER_PATTERNS, LABEL_PATTERNS, LIMITS, PAPERS, SCENES, SHELL_STYLES } from "@/lib/constants";
import type { CassetteInput } from "@/lib/schema";
import { PAPER_STYLES } from "@/lib/patterns";
import { SCENE_STYLES } from "@/lib/defaults";
import { compressImage, copyText } from "@/lib/client";
import { Chips, ColorPicker, Field, FileButton, FontPicker, Slider, Toggle } from "./ui";

type C = CassetteInput;

export function TapePanel({ c, set }: { c: C; set: (p: Partial<C["tape"]>) => void }) {
  const t = c.tape;
  return (
    <div>
      <Field label="Side A label">
        <input className="input" maxLength={40} placeholder={c.title || "Side A title"} value={t.labelA} onChange={(e) => set({ labelA: e.target.value })} />
      </Field>
      <Field label="Side B label">
        <input className="input" maxLength={40} placeholder={c.title || "Side B title"} value={t.labelB} onChange={(e) => set({ labelB: e.target.value })} />
      </Field>
      <Field label="Shell color">
        <ColorPicker value={t.shell} onChange={(shell) => set({ shell })} />
      </Field>
      <Field label="Shell finish">
        <Chips options={SHELL_STYLES} value={t.shellStyle} onChange={(shellStyle) => set({ shellStyle })} />
      </Field>
      <Field label="Label color">
        <ColorPicker value={t.label} onChange={(label) => set({ label })} />
      </Field>
      <Field label="Label pattern">
        <Chips options={LABEL_PATTERNS} value={t.labelPattern} onChange={(labelPattern) => set({ labelPattern })} />
      </Field>
      <Field label="Handwriting">
        <FontPicker value={t.font} onChange={(font) => set({ font })} />
      </Field>
      <Field label="Pen color">
        <ColorPicker value={t.ink} onChange={(ink) => set({ ink })} />
      </Field>
    </div>
  );
}

export function CoverPanel({ c, set, onError }: { c: C; set: (p: Partial<C["cover"]>) => void; onError: (m: string) => void }) {
  const cv = c.cover;
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <Field label="Cover photo">
        <div className="flex flex-wrap gap-2">
          <FileButton
            className="btn btn-primary btn-sm"
            onFile={async (f) => {
              setBusy(true);
              try {
                set({ photo: await compressImage(f, 1100), photoZoom: 1, photoX: 50, photoY: 50 });
              } catch (e) {
                onError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Processing…" : cv.photo ? "Change photo" : "📷 Upload photo"}
          </FileButton>
          {cv.photo && (
            <button className="btn btn-ghost btn-sm" onClick={() => set({ photo: null })}>
              Remove
            </button>
          )}
        </div>
      </Field>
      {cv.photo && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Field label="Zoom">
            <Slider value={cv.photoZoom} min={1} max={3} step={0.05} onChange={(photoZoom) => set({ photoZoom })} />
          </Field>
          <Field label="Left / right">
            <Slider value={cv.photoX} min={0} max={100} onChange={(photoX) => set({ photoX })} />
          </Field>
          <Field label="Up / down">
            <Slider value={cv.photoY} min={0} max={100} onChange={(photoY) => set({ photoY })} />
          </Field>
        </div>
      )}
      <Field label="Cover title">
        <input className="input" maxLength={60} placeholder={c.title || "Cover title"} value={cv.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Subtitle">
        <input className="input" maxLength={60} placeholder="songs for rainy afternoons" value={cv.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
      </Field>
      <Field label="Title font">
        <FontPicker value={cv.font} onChange={(font) => set({ font })} />
      </Field>
      <Field label="Title color">
        <ColorPicker value={cv.ink} onChange={(ink) => set({ ink })} />
      </Field>
      <Field label="Background">
        <ColorPicker value={cv.bg} onChange={(bg) => set({ bg })} />
      </Field>
      <Field label="Pattern">
        <Chips options={COVER_PATTERNS} value={cv.pattern} onChange={(pattern) => set({ pattern })} />
      </Field>
      {cv.pattern !== "plain" && (
        <Field label="Pattern color">
          <ColorPicker value={cv.accent} onChange={(accent) => set({ accent })} />
        </Field>
      )}
      <Field label="Spine color">
        <ColorPicker value={cv.spine} onChange={(spine) => set({ spine })} />
      </Field>
    </div>
  );
}

export function InsidePanel({
  c,
  set,
  setTop,
}: {
  c: C;
  set: (p: Partial<C["inside"]>) => void;
  setTop: (p: Partial<C>) => void;
}) {
  const ins = c.inside;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="To">
          <input className="input" maxLength={40} placeholder="Sam" value={c.to} onChange={(e) => setTop({ to: e.target.value })} />
        </Field>
        <Field label="From">
          <input className="input" maxLength={40} placeholder="Alex" value={c.from} onChange={(e) => setTop({ from: e.target.value })} />
        </Field>
      </div>
      <Field label="Your message" hint={`${c.message.length}/${LIMITS.message}`}>
        <textarea
          className="input min-h-32"
          maxLength={LIMITS.message}
          placeholder="I made you this tape because…"
          value={c.message}
          onChange={(e) => setTop({ message: e.target.value })}
        />
      </Field>
      <Field label="Paper">
        <div className="grid grid-cols-3 gap-2">
          {PAPERS.map((p) => (
            <button
              key={p}
              className="chip h-14 text-left font-semibold"
              data-on={ins.paper === p}
              style={ins.paper === p ? undefined : { ...PAPER_STYLES[p].style, color: PAPER_STYLES[p].ink }}
              onClick={() => set({ paper: p, ink: PAPER_STYLES[p].ink })}
            >
              {PAPER_STYLES[p].label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Handwriting">
        <FontPicker value={ins.font} onChange={(font) => set({ font })} />
      </Field>
      <Field label="Pen color">
        <ColorPicker value={ins.ink} onChange={(ink) => set({ ink })} />
      </Field>
      <Toggle checked={ins.showTracklist} onChange={(showTracklist) => set({ showTracklist })} label="Show the tracklist on the inside" />
      <p className="mt-4 text-xs text-ink/60">Add polaroid photos and stickers from the Stickers tab — they'll go on the inside while it's showing.</p>
    </div>
  );
}

export function SharePanel({
  c,
  setTop,
  shareUrl,
  editUrl,
  onSave,
  saving,
  onDelete,
}: {
  c: C;
  setTop: (p: Partial<C>) => void;
  shareUrl: string | null;
  editUrl: string | null;
  onSave: () => void;
  saving: boolean;
  onDelete?: () => void;
}) {
  return (
    <div>
      <Field label="Mixtape name">
        <input className="input" maxLength={LIMITS.title} placeholder="Summer '26" value={c.title} onChange={(e) => setTop({ title: e.target.value })} />
      </Field>
      <Field label="Backdrop for your friend">
        <div className="grid grid-cols-3 gap-2">
          {SCENES.map((s) => (
            <button
              key={s}
              className="h-16 rounded-xl border-2 p-1.5 text-left text-xs font-bold transition"
              style={{
                background: SCENE_STYLES[s].bg,
                color: SCENE_STYLES[s].fg,
                borderColor: c.scene === s ? "var(--color-ink)" : "transparent",
                boxShadow: c.scene === s ? "3px 3px 0 var(--color-shadow)" : undefined,
              }}
              onClick={() => setTop({ scene: s })}
            >
              {SCENE_STYLES[s].label}
            </button>
          ))}
        </div>
      </Field>
      <button className="btn btn-primary mb-5 w-full py-3 text-lg" onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : shareUrl ? "Save changes" : "Save & get link ✦"}
      </button>
      {shareUrl && editUrl && <LinkBoxes shareUrl={shareUrl} editUrl={editUrl} />}
      {onDelete && (
        <button
          className="mt-6 py-2 text-sm text-cherry underline"
          onClick={() => confirm("Delete this mixtape forever? The link will stop working.") && onDelete()}
        >
          Delete this mixtape
        </button>
      )}
    </div>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input className="input text-sm" readOnly value={value} onFocus={(e) => e.target.select()} />
      <button
        className="btn btn-dark btn-sm shrink-0"
        onClick={async () => {
          if (await copyText(value)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export function LinkBoxes({ shareUrl, editUrl }: { shareUrl: string; editUrl: string }) {
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="space-y-4">
      <div>
        <p className="label">Share link — send this to your friend</p>
        <CopyRow value={shareUrl} />
        <div className="mt-2 flex flex-wrap gap-2">
          <a className="btn btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`I made you a mixtape 📼 ${shareUrl}`)}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          {canShare && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.share({ title: "A mixtape for you", url: shareUrl }).catch(() => {})}>
              Share…
            </button>
          )}
          <a className="btn btn-ghost btn-sm" href={shareUrl} target="_blank" rel="noreferrer">
            Preview ↗
          </a>
        </div>
      </div>
      <div className="rounded-xl bg-mustard/25 p-3">
        <p className="label">Secret edit link — keep this for yourself</p>
        <CopyRow value={editUrl} />
        <p className="mt-2 text-xs text-ink/70">Anyone with this link can edit the tape. This browser remembers it too, so you'll find it on the home page.</p>
      </div>
    </div>
  );
}
