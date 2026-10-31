import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCassette } from "@/lib/store";
import { SharedTape } from "@/components/SharedTape";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await getCassette(id);
  if (!c) return { title: "Mixtape not found" };
  const title = `${c.title} — a mixtape${c.from ? ` from ${c.from}` : ""}`;
  const description = `${c.tracks.length} songs: ${c.tracks
    .slice(0, 4)
    .map((t) => t.title)
    .join(", ")}${c.tracks.length > 4 ? "…" : ""}`;
  return { title, description, openGraph: { title, description, type: "music.playlist" } };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const cassette = await getCassette(id);
  if (!cassette) notFound();
  return <SharedTape c={cassette} />;
}
