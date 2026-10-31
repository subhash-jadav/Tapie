"use client";
// Very subtle UI sounds, synthesised with the Web Audio API (no audio files to load),
// plus a light haptic tick on phones. Everything is quiet by design; users can mute it.

export const SOUND_KEY = "tapie:sound";
type Sound = "pop" | "whoosh" | "thunk" | "chime" | "tape" | "remove";

let ctx: AudioContext | null = null;
let muted: boolean | null = null;
const listeners = new Set<(m: boolean) => void>();

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = localStorage.getItem(SOUND_KEY) === "off";
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(SOUND_KEY, m ? "off" : "on");
  } catch {}
  listeners.forEach((f) => f(m));
}

export function onMutedChange(f: (m: boolean) => void) {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** A short tone with a soft attack and exponential decay. */
function tone(a: AudioContext, freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine", glideTo?: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + Math.min(0.025, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(a.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

const HAPTIC: Partial<Record<Sound, number | number[]>> = { pop: 5, thunk: 8, chime: 6, tape: 5 };

export function sfx(name: Sound) {
  if (typeof window === "undefined") return;
  if (matchMedia("(pointer: coarse)").matches && HAPTIC[name] && !isMuted()) navigator.vibrate?.(HAPTIC[name]!);
  if (isMuted()) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.005;
  // Simple, soft sine tones only — quiet, short, no clicks or noise.
  switch (name) {
    case "pop": // something added (song, sticker)
      tone(a, 660, t, 0.12, 0.016, "sine", 760);
      break;
    case "remove":
      tone(a, 560, t, 0.12, 0.012, "sine", 480);
      break;
    case "whoosh": // flips, theme change
      tone(a, 420, t, 0.22, 0.01, "sine", 620);
      break;
    case "thunk": // save
      tone(a, 330, t, 0.18, 0.016);
      break;
    case "chime": // a design is ready / saved for the first time
      tone(a, 660, t, 0.3, 0.012);
      tone(a, 990, t + 0.09, 0.34, 0.009);
      break;
    case "tape": // play / pause
      tone(a, 440, t, 0.1, 0.012, "sine", 400);
      break;
  }
}
