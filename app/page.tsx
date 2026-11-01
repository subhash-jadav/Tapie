import Link from "next/link";
import { SurfaceView } from "@/components/Surfaces";
import { MyTapes } from "@/components/MyTapes";
import { demoCassette } from "@/lib/defaults";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteFooter } from "@/components/SiteFooter";

const STEPS = [
  { n: "01", title: "Paste your songs", text: "Drop in YouTube songs or a whole playlist. We grab every track for you." },
  { n: "02", title: "Make it yours", text: "Colors, cover photo, stickers, polaroids, a handwritten note inside the case." },
  { n: "03", title: "Send the link", text: "Your friend flips the case, reads your note and plays the tape, side A to B." },
];

export default function Home() {
  const demo = demoCassette();
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-display text-2xl">
          Tapiee<span className="text-orange">.</span>
        </span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/create" className="btn btn-ghost btn-sm">
            Start a tape
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 px-4 py-10 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div className="pop-in">
          <p className="mb-3 font-type text-sm tracking-widest text-orange">REC ● SINCE YOU'VE BEEN GONE</p>
          <h1 className="mb-5 font-display text-5xl leading-[1.05] sm:text-6xl">
            Make someone
            <br />a mixtape.
          </h1>
          <p className="mb-8 max-w-md text-lg text-ink/70">
            Turn your favourite YouTube songs into a cassette you design yourself, with stickers, photos and a note inside the
            case. Then share it with one link.
          </p>
          <Link href="/create" className="btn btn-primary px-6 py-3 text-lg">
            Start your mixtape →
          </Link>
          <p className="mt-4 text-sm text-ink/50">Free · no sign-up · works on your phone</p>
        </div>
        <div className="float relative mx-auto w-full max-w-md">
          <div className="absolute left-[3%] -top-8 w-[80%] rotate-[-7deg] opacity-90 md:-left-6 md:-top-10 md:w-[85%] md:rotate-[-8deg]">
            <SurfaceView c={demo} surface="cover" />
          </div>
          <div className="relative mx-auto mt-24 w-[94%] rotate-[4deg] md:w-full">
            <SurfaceView c={demo} surface="tapeA" spinning />
          </div>
        </div>
      </main>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-6">
              <div className="mb-2 font-type text-orange">{s.n}</div>
              <h3 className="mb-1 font-display text-2xl">{s.title}</h3>
              <p className="text-ink/70">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <MyTapes />
      <SiteFooter />
    </div>
  );
}
