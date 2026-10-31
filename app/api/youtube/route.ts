import { NextResponse } from "next/server";
import { importFromYouTube, YouTubeError } from "@/lib/youtube";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!rateLimit(`yt:${clientIp(req)}`, 40, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  if (typeof body?.url !== "string" || body.url.length > 500) {
    return NextResponse.json({ error: "Paste a YouTube link." }, { status: 400 });
  }
  try {
    return NextResponse.json(await importFromYouTube(body.url));
  } catch (e) {
    if (e instanceof YouTubeError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("youtube import failed", e);
    return NextResponse.json({ error: "YouTube didn't respond. Try again." }, { status: 502 });
  }
}
