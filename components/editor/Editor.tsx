"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { H, LIMITS, SURFACE_LABELS, W, type SurfaceKey } from "@/lib/constants";
import type { CassetteInput, Layer } from "@/lib/schema";
import { clamp, forgetTape, rememberTape, uid } from "@/lib/client";
import { SurfaceView } from "../Surfaces";
import { FlipCard } from "../FlipCard";
import { mergeTracks, SongsPanel, splitSides } from "./SongsPanel";
import { LayerToolbar, StickersPanel, type NewLayer } from "./StickersPanel";
import { CoverPanel, InsidePanel, LinkBoxes, SharePanel, TapePanel } from "./DesignPanels";

type C = CassetteInput;
type Panel = "songs" | "tape" | "cover" | "inside" | "stickers" | "share";

const PANELS: { key: Panel; icon: string; label: string }[] = [
  { key: "songs", icon: "♫", label: "Songs" },
  { key: "tape", icon: "📼", label: "Tape" },
  { key: "cover", icon: "🖼", label: "Cover" },
  { key: "inside", icon: "💌", label: "Inside" },
  { key: "stickers", icon: "✨", label: "Stickers" },
  { key: "share", icon: "🔗", label: "Share" },
];

export const DRAFT_KEY = "mixtape:draft";

const countImages = (c: C) =>
  Object.values(c.layers)
    .flat()
    .filter((l) => l.type === "image" || l.type === "photo").length + (c.cover.photo ? 1 : 0);

export function Editor({ initial, id: initialId, editKey: initialKey }: { initial: C; id?: string; editKey?: string }) {
  const [c, setC] = useState<C>(initial);
  const [id, setId] = useState(initialId);
  const [key, setKey] = useState(initialKey);
  const [surface, setSurface] = useState<SurfaceKey>("tapeA");
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(initial.tracks.length ? "tape" : "songs");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [dialog, setDialog] = useState(false);
  const autoSplit = useRef(!initialId);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((text: string, ok = false) => {
    setToast({ ok, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const update = useCallback((fn: (d: C) => C) => {
    setC(fn);
    setDirty(true);
  }, []);
  const setTop = (p: Partial<C>) => update((d) => ({ ...d, ...p }));
  const setTape = (p: Partial<C["tape"]>) => update((d) => ({ ...d, tape: { ...d.tape, ...p } }));
  const setCover = (p: Partial<C["cover"]>) => update((d) => ({ ...d, cover: { ...d.cover, ...p } }));
  const setInside = (p: Partial<C["inside"]>) => update((d) => ({ ...d, inside: { ...d.inside, ...p } }));
  const setLayers = useCallback(
    (s: SurfaceKey, fn: (l: Layer[]) => Layer[]) => update((d) => ({ ...d, layers: { ...d.layers, [s]: fn(d.layers[s]) } })),
    [update],
  );

  const layers = c.layers[surface];
  const selectedLayer = layers.find((l) => l.id === selected) ?? null;

  const changeLayer = useCallback(
    (lid: string, p: Partial<Layer>) => setLayers(surface, (ls) => ls.map((l) => (l.id === lid ? ({ ...l, ...p } as Layer) : l))),
    [setLayers, surface],
  );

  function addLayer(nl: NewLayer) {
    if (layers.length >= LIMITS.layersPerSurface) return notify(`Max ${LIMITS.layersPerSurface} items per side`);
    if ((nl.type === "image" || nl.type === "photo") && countImages(c) >= LIMITS.images) return notify(`Max ${LIMITS.images} photos per tape`);
    const r = (n: number) => (Math.random() * 2 - 1) * n;
    const layer = { ...nl, id: uid(), x: W / 2 + r(70), y: H / 2 + r(50), rot: nl.type === "text" ? r(4) : r(12) } as Layer;
    setLayers(surface, (ls) => [...ls, layer]);
    setSelected(layer.id);
  }

  function removeLayer(lid: string) {
    setLayers(surface, (ls) => ls.filter((l) => l.id !== lid));
    setSelected(null);
  }

  function orderLayer(lid: string, dir: 1 | -1) {
    setLayers(surface, (ls) => {
      const i = ls.findIndex((l) => l.id === lid);
      const j = clamp(i + dir, 0, ls.length - 1);
      const next = [...ls];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function duplicateLayer(l: Layer) {
    if (layers.length >= LIMITS.layersPerSurface) return;
    const copy = { ...l, id: uid(), x: l.x + 24, y: l.y + 24 } as Layer;
    setLayers(surface, (ls) => [...ls, copy]);
    setSelected(copy.id);
  }

  function goSurface(s: SurfaceKey) {
    setSurface(s);
    setSelected(null);
  }

  function openPanel(p: Panel) {
    setPanel(p);
    if (p === "tape" && !surface.startsWith("tape")) goSurface("tapeA");
    if (p === "cover") goSurface("cover");
    if (p === "inside") goSurface("inside");
  }

  function flip() {
    const other: Record<SurfaceKey, SurfaceKey> = { tapeA: "tapeB", tapeB: "tapeA", cover: "inside", inside: "cover" };
    goSurface(other[surface]);
  }

  function onImported(r: { kind: string; title: string; tracks: Parameters<typeof mergeTracks>[1] }) {
    const res = mergeTracks(c.tracks, r.tracks);
    update((d) => ({
      ...d,
      title: d.title || (r.kind === "playlist" ? r.title.slice(0, LIMITS.title) : d.title),
      tracks: autoSplit.current ? splitSides(res.tracks) : res.tracks,
    }));
    const extra = [res.dupes && `${res.dupes} already on the tape`, res.cut && `${res.cut} didn't fit (max ${LIMITS.tracks})`].filter(Boolean);
    return `Added ${res.added} song${res.added === 1 ? "" : "s"}${extra.length ? ` · ${extra.join(" · ")}` : ""}`;
  }

  // Keyboard: Delete removes, Esc deselects, arrows nudge.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (!selected || t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeLayer(selected);
      } else if (e.key === "Escape") setSelected(null);
      else if (e.key.startsWith("Arrow") && selectedLayer) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        changeLayer(selected, { x: selectedLayer.x + dx, y: selectedLayer.y + dy });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Keep a local draft while creating, so a refresh doesn't lose work.
  useEffect(() => {
    if (id || !dirty) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(c));
      } catch {
        // Storage full (big photos) — the draft just won't persist.
      }
    }, 800);
    return () => clearTimeout(t);
  }, [c, id, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = id ? `${origin}/c/${id}` : null;
  const editUrl = id && key ? `${origin}/edit/${id}#${key}` : null;

  async function save() {
    const payload: C = { ...c, title: c.title.trim() };
    if (!payload.tracks.length) {
      openPanel("songs");
      return notify("Add at least one song first");
    }
    if (!payload.title) {
      openPanel("share");
      return notify("Give your mixtape a name");
    }
    const body = JSON.stringify(payload);
    if (body.length > LIMITS.bodyBytes) return notify("Your tape is too big — remove a few photos");

    setSaving(true);
    try {
      const res = await fetch(id ? `/api/cassettes/${id}` : "/api/cassettes", {
        method: id ? "PUT" : "POST",
        headers: { "content-type": "application/json", ...(key ? { "x-edit-key": key } : {}) },
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return notify(json.error || "Couldn't save. Try again.");
      setDirty(false);
      if (!id) {
        setId(json.id);
        setKey(json.editKey);
        rememberTape({ id: json.id, key: json.editKey, title: payload.title, updatedAt: json.cassette.updatedAt });
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        window.history.replaceState(null, "", `/edit/${json.id}#${json.editKey}`);
        setDialog(true);
      } else {
        rememberTape({ id, key: key!, title: payload.title, updatedAt: json.cassette.updatedAt });
        notify("Saved ✓", true);
      }
    } catch {
      notify("Network error. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!id || !key) return;
    const res = await fetch(`/api/cassettes/${id}`, { method: "DELETE", headers: { "x-edit-key": key } });
    if (!res.ok) return notify("Couldn't delete.");
    forgetTape(id);
    setDirty(false);
    window.location.href = "/";
  }

  const isTape = surface.startsWith("tape");
  const view = (s: SurfaceKey) => (
    <SurfaceView
      c={c}
      surface={s}
      editable={s === surface}
      selectedId={selected}
      onSelect={setSelected}
      onLayerChange={changeLayer}
    />
  );

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="font-display text-2xl">
          mixtape<span className="text-orange">.</span>
        </Link>
        <span className="hidden text-sm text-ink/50 sm:block">{dirty ? "Unsaved changes" : id ? "All changes saved" : ""}</span>
        <div className="ml-auto flex gap-2">
          {shareUrl && (
            <a className="btn btn-ghost btn-sm" href={shareUrl} target="_blank" rel="noreferrer">
              Preview ↗
            </a>
          )}
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : id ? "Save" : "Save & share"}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-16 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="max-lg:sticky max-lg:top-0 max-lg:z-20 max-lg:-mx-4 max-lg:bg-cream/95 max-lg:px-4 max-lg:pb-3 max-lg:pt-1 max-lg:backdrop-blur lg:sticky lg:top-4 lg:self-start lg:pt-2">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {(Object.keys(SURFACE_LABELS) as SurfaceKey[]).map((s) => (
              <button key={s} className="chip text-xs sm:text-sm" data-on={s === surface} onClick={() => goSurface(s)}>
                {SURFACE_LABELS[s]}
              </button>
            ))}
            <button className="btn btn-dark btn-sm ml-auto" onClick={flip} title="Flip to see the other side">
              ↻ Flip
            </button>
          </div>
          <div className="mx-auto max-w-[760px] max-lg:max-w-[min(100%,calc(42dvh*1.6))] lg:px-6">
            {isTape ? (
              <FlipCard flipped={surface === "tapeB"} front={view("tapeA")} back={view("tapeB")} />
            ) : (
              <FlipCard flipped={surface === "inside"} front={view("cover")} back={view("inside")} />
            )}
          </div>
          <p className="mt-3 hidden text-center text-sm text-ink/50 lg:block">
            Editing <b>{SURFACE_LABELS[surface]}</b> · add stickers & photos from the ✨ tab, then drag them around
          </p>
        </section>

        <aside>
          {selectedLayer && (
            <LayerToolbar
              layer={selectedLayer}
              onChange={(p) => changeLayer(selectedLayer.id, p)}
              onDelete={() => removeLayer(selectedLayer.id)}
              onDuplicate={() => duplicateLayer(selectedLayer)}
              onOrder={(d) => orderLayer(selectedLayer.id, d)}
              onDone={() => setSelected(null)}
            />
          )}
          <div className="card overflow-hidden">
            <nav className="grid grid-cols-6 border-b-2 border-ink">
              {PANELS.map((p) => (
                <button
                  key={p.key}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition ${
                    panel === p.key ? "bg-ink text-paper" : "hover:bg-cream"
                  }`}
                  onClick={() => openPanel(p.key)}
                >
                  <span className="text-lg leading-none">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </nav>
            <div className="p-4 sm:p-5">
              {panel === "songs" && (
                <SongsPanel
                  tracks={c.tracks}
                  onChange={(tracks) => {
                    autoSplit.current = false;
                    update((d) => ({ ...d, tracks }));
                  }}
                  onImported={onImported}
                />
              )}
              {panel === "tape" && <TapePanel c={c} set={setTape} />}
              {panel === "cover" && <CoverPanel c={c} set={setCover} onError={notify} />}
              {panel === "inside" && <InsidePanel c={c} set={setInside} setTop={setTop} />}
              {panel === "stickers" && (
                <>
                  <p className="mb-3 text-sm">
                    Adding to <b>{SURFACE_LABELS[surface]}</b>
                  </p>
                  <StickersPanel onAdd={addLayer} onError={notify} />
                </>
              )}
              {panel === "share" && (
                <SharePanel
                  c={c}
                  setTop={setTop}
                  shareUrl={shareUrl}
                  editUrl={editUrl}
                  onSave={save}
                  saving={saving}
                  onDelete={id ? del : undefined}
                />
              )}
            </div>
          </div>
        </aside>
      </main>

      {toast && (
        <div
          className={`pop-in fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border-2 border-ink px-4 py-2 font-semibold shadow-[3px_3px_0_#2b2118] ${
            toast.ok ? "bg-teal text-paper" : "bg-paper"
          }`}
        >
          {toast.text}
        </div>
      )}

      {dialog && shareUrl && editUrl && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" onClick={() => setDialog(false)}>
          <div className="card pop-in w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 font-display text-3xl">Your mixtape is ready! 📼</h2>
            <p className="mb-5 text-ink/70">Send the share link to your friend. They can flip the case, read your note and play every song.</p>
            <LinkBoxes shareUrl={shareUrl} editUrl={editUrl} />
            <button className="btn btn-dark mt-6 w-full" onClick={() => setDialog(false)}>
              Keep decorating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
