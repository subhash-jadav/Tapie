import { NextResponse } from "next/server";
import { CassetteInputSchema, formatIssues, type CassetteInput } from "@/lib/schema";
import { LIMITS } from "@/lib/constants";

// Reads and validates a cassette from a request body; returns either data or an error response.
export async function readCassetteBody(req: Request): Promise<{ data: CassetteInput } | { error: NextResponse }> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > LIMITS.bodyBytes) {
    return { error: NextResponse.json({ error: "Your mixtape is too big. Try fewer or smaller photos." }, { status: 413 }) };
  }
  const text = await req.text();
  if (text.length > LIMITS.bodyBytes) {
    return { error: NextResponse.json({ error: "Your mixtape is too big. Try fewer or smaller photos." }, { status: 413 }) };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: NextResponse.json({ error: "Invalid data" }, { status: 400 }) };
  }
  const parsed = CassetteInputSchema.safeParse(json);
  if (!parsed.success) {
    return { error: NextResponse.json({ error: formatIssues(parsed.error) }, { status: 400 }) };
  }
  return { data: parsed.data };
}
