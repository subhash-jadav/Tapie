import { NextResponse } from "next/server";
import { z } from "zod";
import { songSignals } from "@/lib/songInfo";
import { moodFromSignals, nearestVibe } from "@/lib/vibes";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const Body = z.object({
  tracks: z
    .array(z.object({ videoId: z.string().regex(/^[\w-]{11}$/), title: z.string().max(200), artist: z.string().max(120) }))
    .min(1)
    .max(100),
  context: z.string().max(400).default(""),
  colors: z
    .object({ colors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(8), brightness: z.number(), saturation: z.number() })
    .nullable()
    .default(null),
});

/** Work out a tape's mood from real song data (genre, era, YouTube tags) + its artwork tone. */
export async function POST(req: Request) {
  if (!(await rateLimit(`vibe:${clientIp(req)}`, 30, 10 * 60_000))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { tracks, context, colors } = parsed.data;
  const songs = await songSignals(tracks);
  const mood = moodFromSignals(songs, context, colors);
  return NextResponse.json({ mood, vibe: nearestVibe(mood), songs: songs.map((s) => ({ title: s.title, genre: s.genre, year: s.year })) });
}
