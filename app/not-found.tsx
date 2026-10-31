import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="mb-2 font-type tracking-widest text-orange">ERROR 404 · TAPE CHEWED</p>
        <h1 className="mb-3 font-display text-4xl">This mixtape got lost</h1>
        <p className="mb-6 text-ink/70">The link might be wrong, or the tape was deleted.</p>
        <Link href="/create" className="btn btn-primary">
          Make a new one
        </Link>
      </div>
    </main>
  );
}
