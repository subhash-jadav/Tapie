import { NextResponse } from "next/server";
import { searchYouTube, YouTubeError } from "@/lib/youtube";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 120) {
    return NextResponse.json({ error: "Type a song name to search." }, { status: 400 });
  }
  if (!rateLimit(`search:${clientIp(req)}`, 80, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many searches. Try again in a few minutes." }, { status: 429 });
  }
  try {
    return NextResponse.json({ results: await searchYouTube(q) });
  } catch (e) {
    if (e instanceof YouTubeError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("youtube search failed", e);
    return NextResponse.json({ error: "YouTube didn't respond. Try again." }, { status: 502 });
  }
}
