"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { H, LIMITS, SURFACE_LABELS, SURFACE_SHORT_LABELS, W, type SurfaceKey } from "@/lib/constants";
import type { CassetteInput, Layer } from "@/lib/schema";
import { clamp, forgetTape, rememberTape, uid } from "@/lib/client";
import { SurfaceView } from "../Surfaces";
import { FlipCard } from "../FlipCard";
import { mergeTracks, SongsPanel, splitSides, type Imported } from "./SongsPanel";
import { LayerToolbar, StickersPanel, type NewLayer } from "./StickersPanel";
import { CoverPanel, InsidePanel, LinkBoxes, SharePanel, TapePanel } from "./DesignPanels";
import { VibeBar, type CoverMode } from "./VibeBar";
import { describeMood, designFromMood, detectVibe, isAutoNote, moodForVibe, plainDesign, type Mood, type VibeKey } from "@/lib/vibes";
import { songArtCover, thumbColors } from "@/lib/thumbs";
import { defaultCassette } from "@/lib/defaults";
import { animateOut, withTransition } from "@/lib/motion";
import { sfx } from "@/lib/sfx";
import { ReadingSongs } from "./ReadingSongs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteFooter } from "@/components/SiteFooter";

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

type Toast = { ok: boolean; text: string; action?: { label: string; run: () => void } };

/** Ask the server for the songs' mood (genre, era, YouTube tags + artwork tone); fall back to an in-browser guess offline. */
async function guessMood(tracks: C["tracks"], context: string, colors: Awaited<ReturnType<typeof thumbColors>>): Promise<Mood> {
  try {
    const res = await fetch("/api/vibe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tracks: tracks.map(({ videoId, title, artist }) => ({ videoId, title, artist })),
        context: context.slice(-400),
        colors,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return (await res.json()).mood as Mood;
  } catch {}
  return detectVibe(tracks, context, colors).mood;
}

export function Editor({
  initial,
  id: initialId,
  editKey: initialKey,
  autoVibe = false,
  vibeHint = "",
}: {
  initial: C;
  id?: string;
  editKey?: string;
  /** Style the tape automatically from its songs once they're in. */
  autoVibe?: boolean;
  /** Search words / playlist names already used, to help guess the vibe. */
  vibeHint?: string;
}) {
  const [c, setC] = useState<C>(initial);
  const [id, setId] = useState(initialId);
  const [key, setKey] = useState(initialKey);
  const [surface, setSurface] = useState<SurfaceKey>("tapeA");
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(initial.tracks.length ? "tape" : "songs");
  // A new tape that already has songs is unsaved work from the start (keep a draft, warn on leave).
  const [dirty, setDirty] = useState(!initialId && initial.tracks.length > 0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [vibeBusy, setVibeBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const autoSplit = useRef(!initialId);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((text: string, ok = false, action?: Toast["action"]) => {
    setToast({ ok, text, action });
    setToastLeaving(false);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToastLeaving(true); // slide out, then unmount
      toastTimer.current = setTimeout(() => setToast(null), 230);
    }, action ? 6000 : 3500);
  }, []);

  // The vibe auto-design only runs while the user hasn't styled anything by hand.
  const touched = useRef(!!initialId);
  const pendingVibe = useRef(autoVibe);
  const [reading, setReading] = useState(autoVibe && initial.tracks.length > 0);
  const hint = useRef(vibeHint);
  // Title/subtitle we generated last time — only those (or empty ones) may be replaced on a restyle.
  const autoText = useRef<{ title?: string; subtitle?: string }>({});
  const cRef = useRef(c);
  cRef.current = c;

  const update = useCallback((fn: (d: C) => C) => {
    setC(fn);
    setDirty(true);
  }, []);
  const setTop = (p: Partial<C>) => update((d) => ({ ...d, ...p }));
  const design = useCallback(
    (fn: (d: C) => C) => {
      touched.current = true;
      update(fn);
    },
    [update],
  );
  const setTape = (p: Partial<C["tape"]>) => design((d) => ({ ...d, tape: { ...d.tape, ...p } }));
  const setCover = (p: Partial<C["cover"]>) => design((d) => ({ ...d, cover: { ...d.cover, ...p } }));
  const setInside = (p: Partial<C["inside"]>) => design((d) => ({ ...d, inside: { ...d.inside, ...p } }));
  const setLayers = useCallback(
    (s: SurfaceKey, fn: (l: Layer[]) => Layer[]) => design((d) => ({ ...d, layers: { ...d.layers, [s]: fn(d.layers[s]) } })),
    [design],
  );

  const textOptions = (d: C) => ({
    replaceMessage: !d.message.trim() || isAutoNote(d.message, d.tracks[0]?.title.slice(0, 40)),
    replaceTitle: !d.title.trim() || d.title === autoText.current.title,
    replaceSubtitle: !d.cover.subtitle.trim() || d.cover.subtitle === autoText.current.subtitle,
  });

  /**
   * Generate a design. "guess" reads the songs' mood; a vibe steers the mood; "shuffle" keeps the mood
   * and only re-rolls the choices. Colors always come from the songs' own artwork. Offers an undo.
   */
  async function applyVibe(how: { guess: true } | { vibe: VibeKey } | { shuffle: true }) {
    setVibeBusy(true);
    const before = cRef.current;
    try {
      const art = await thumbColors(before.tracks.map((t) => t.videoId));
      const mood: Mood =
        "vibe" in how
          ? moodForVibe(how.vibe, before.mood)
          : "shuffle" in how && before.mood
            ? before.mood
            : await guessMood(before.tracks, hint.current, art);
      const seed = Math.floor(Math.random() * 1e9);
      // The cassette crossfades from the old design to the new one.
      withTransition(() =>
        update((d) => {
          const next = designFromMood(d, mood, art, seed, textOptions(d));
          autoText.current = { title: next.title, subtitle: next.cover.subtitle };
          return next;
        }),
      );
      sfx("chime");
      notify(`✨ Styled: ${describeMood(mood)}`, true, { label: "Undo", run: () => update(() => before) });
    } finally {
      setVibeBusy(false);
    }
  }

  function makePlain() {
    const before = cRef.current;
    withTransition(() => update((d) => plainDesign(d, defaultCassette(), textOptions(d))));
    notify("Back to the plain design", true, { label: "Undo", run: () => update(() => before) });
  }

  async function setCoverArt(mode: CoverMode) {
    if (mode === "pattern") return setCover({ photo: null });
    setVibeBusy(true);
    try {
      const ids = cRef.current.tracks.map((t) => t.videoId);
      // A collage of one song repeated looks odd — use the top song's art until there are 4.
      const collage = mode === "collage" && ids.length >= 4;
      if (mode === "collage" && !collage) notify("Collage needs 4 songs — using the top song's art for now");
      const photo = await songArtCover(ids, collage ? "collage" : "single");
      setCover({ photo, photoZoom: 1, photoX: 50, photoY: 50, ink: "#fffaf0" });
    } catch (e) {
      notify(e instanceof Error && e.message.startsWith("Add") ? e.message : "Couldn't load the song art. Try again.");
    } finally {
      setVibeBusy(false);
    }
  }

  // Run the automatic vibe once the first songs land.
  useEffect(() => {
    if (pendingVibe.current && c.tracks.length) {
      pendingVibe.current = false;
      const shownAt = Date.now();
      applyVibe({ guess: true }).finally(() => {
        // keep the moment on screen long enough to read, then fade it away
        setTimeout(() => setReading(false), Math.max(700, 1800 - (Date.now() - shownAt)));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.tracks.length]);

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
    sfx("pop");
  }

  function removeLayer(lid: string) {
    setSelected(null);
    sfx("remove");
    const el = document.querySelector(`[data-layer-id="${lid}"] > .sticker-lift`);
    animateOut(el, () => setLayers(surface, (ls) => ls.filter((l) => l.id !== lid)));
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
    sfx("pop");
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
    sfx("whoosh");
    goSurface(other[surface]);
  }

  function onImported(r: Imported) {
    hint.current += ` ${r.query ?? (r.kind === "playlist" ? r.title : "")}`;
    const res = mergeTracks(c.tracks, r.tracks);
    if (!c.tracks.length && !touched.current) pendingVibe.current = true;
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
        sfx("chime");
        setDialog(true);
      } else {
        rememberTape({ id, key: key!, title: payload.title, updatedAt: json.cassette.updatedAt });
        sfx("thunk");
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
      editing
      selectedId={selected}
      onSelect={setSelected}
      onLayerChange={changeLayer}
    />
  );

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="font-display text-2xl">
          Tapie<span className="text-orange">.</span>
        </Link>
        <span className="hidden text-sm text-ink/50 sm:block">{dirty ? "Unsaved changes" : id ? "All changes saved" : ""}</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="mr-1" />
          {shareUrl && (
            <a className="btn btn-ghost btn-sm" href={shareUrl} target="_blank" rel="noreferrer" aria-label="Preview">
              <span className="max-sm:hidden">Preview </span>↗
            </a>
          )}
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : id ? "Save" : "Save & share"}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-16 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="max-lg:sticky max-lg:top-0 max-lg:z-20 max-lg:-mx-4 max-lg:bg-cream/95 max-lg:px-4 max-lg:pb-3 max-lg:pt-1 max-lg:backdrop-blur lg:sticky lg:top-4 lg:self-start lg:pt-2">
          <VibeBar
            vibe={c.vibe}
            moodText={c.mood ? describeMood(c.mood) : undefined}
            busy={vibeBusy}
            hasPhoto={!!c.cover.photo}
            onPick={(v) => applyVibe(v ? { vibe: v } : { guess: true })}
            onShuffle={() => applyVibe(c.mood ? { shuffle: true } : { guess: true })}
            onPlain={makePlain}
            onCover={setCoverArt}
          />
          {/* One row on phones (scrolls sideways) so the pinned preview stays compact. */}
          <div className="mb-3 flex items-center gap-1.5">
            <div className="-my-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1 max-sm:[scrollbar-width:none] sm:flex-wrap">
              {(Object.keys(SURFACE_LABELS) as SurfaceKey[]).map((s) => (
                <button
                  key={s}
                  className="chip shrink-0 whitespace-nowrap text-xs max-sm:px-2 sm:text-sm"
                  data-on={s === surface}
                  onClick={() => goSurface(s)}
                  aria-label={SURFACE_LABELS[s]}
                >
                  <span className="sm:hidden">{SURFACE_SHORT_LABELS[s]}</span>
                  <span className="max-sm:hidden">{SURFACE_LABELS[s]}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-dark btn-sm shrink-0" onClick={flip} title="Flip to see the other side" aria-label="Flip">
              ↻<span className="max-sm:hidden"> Flip</span>
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
            <nav className="relative grid grid-cols-6 border-b-2 border-ink">
              {/* The active-tab highlight slides between tabs. */}
              <span
                aria-hidden
                className="tab-indicator absolute inset-y-0 left-0 w-1/6 bg-ink"
                style={{ transform: `translateX(${PANELS.findIndex((p) => p.key === panel) * 100}%)` }}
              />
              {PANELS.map((p) => (
                <button
                  key={p.key}
                  className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors duration-300 ${
                    panel === p.key ? "text-paper" : "hover:bg-ink/5"
                  }`}
                  onClick={() => openPanel(p.key)}
                  aria-current={panel === p.key ? "page" : undefined}
                >
                  <span className="text-lg leading-none">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </nav>
            <div key={panel} className="panel-in p-4 sm:p-5">
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
      <SiteFooter className="-mt-10" />

      {toast && (
        <div
          data-leaving={toastLeaving}
          className={`toast fixed bottom-5 left-1/2 z-50 rounded-xl border-2 border-ink px-4 py-2 font-semibold shadow-[3px_3px_0_var(--color-shadow)] ${
            toast.ok ? "bg-teal text-paper" : "bg-paper"
          }`}
        >
          {toast.text}
          {toast.action && (
            <button
              className="ml-3 underline"
              onClick={() => {
                toast.action!.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}

      {reading && <ReadingSongs tracks={c.tracks} done={!vibeBusy && !pendingVibe.current && !!c.mood} />}

      {dialog && shareUrl && editUrl && (
        <div className="fade-in fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-[2px]" onClick={() => setDialog(false)}>
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
