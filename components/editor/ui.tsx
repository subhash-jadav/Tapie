"use client";
import type { ReactNode } from "react";
import { FONT_KEYS, FONTS, SWATCHES, type FontKey } from "@/lib/constants";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        {hint && <span className="text-xs text-ink/50">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          className="swatch"
          data-on={c.toLowerCase() === value.toLowerCase()}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
        />
      ))}
      <label className="swatch relative cursor-pointer overflow-hidden" title="Custom color" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" className="chip capitalize" data-on={o === value} onClick={() => onChange(o)}>
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export function FontPicker({ value, onChange }: { value: FontKey; onChange: (v: FontKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {FONT_KEYS.map((f) => (
        <button
          key={f}
          type="button"
          className="chip truncate"
          data-on={f === value}
          style={{ fontFamily: FONTS[f].css }}
          onClick={() => onChange(f)}
        >
          {FONTS[f].label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      className="w-full accent-orange"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="flex cursor-pointer items-center gap-3 text-sm font-medium"
      onClick={() => onChange(!checked)}
    >
      <span className={`relative h-6 w-11 shrink-0 rounded-full border-2 border-ink transition ${checked ? "bg-teal" : "bg-field"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-all ${checked ? "left-5" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

export function FileButton({
  children,
  accept = "image/*",
  onFile,
  className = "btn btn-ghost btn-sm",
}: {
  children: ReactNode;
  accept?: string;
  onFile: (f: File) => void;
  className?: string;
}) {
  return (
    <label className={`${className} cursor-pointer`}>
      {children}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
