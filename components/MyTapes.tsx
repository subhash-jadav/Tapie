"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { forgetTape, getMyTapes, type MyTape } from "@/lib/client";

export function MyTapes() {
  const [tapes, setTapes] = useState<MyTape[]>([]);
  useEffect(() => setTapes(getMyTapes()), []);
  if (!tapes.length) return null;
  return (
    <section id="my-tapes" className="mx-auto max-w-5xl px-4 pb-20">
      <h2 className="mb-4 font-display text-3xl">Your tapes</h2>
      <p className="mb-4 text-sm text-ink/60">Saved in this browser. Keep your edit links somewhere safe to edit from other devices.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {tapes.map((t) => (
          <li key={t.id} className="card flex items-center gap-3 p-4">
            <span className="text-3xl">📼</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{t.title}</div>
              <div className="text-xs text-ink/50">{new Date(t.updatedAt).toLocaleDateString()}</div>
            </div>
            <Link className="btn btn-ghost btn-sm" href={`/c/${t.id}`}>
              Play
            </Link>
            <Link className="btn btn-dark btn-sm" href={`/edit/${t.id}#${t.key}`}>
              Edit
            </Link>
            <button
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink/40 hover:text-cherry"
              title="Remove from this list"
              aria-label="Remove from this list"
              onClick={() => {
                forgetTape(t.id);
                setTapes(getMyTapes());
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
