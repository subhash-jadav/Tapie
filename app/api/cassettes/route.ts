import { NextResponse } from "next/server";
import { createCassette } from "@/lib/store";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { readCassetteBody } from "./body";

export async function POST(req: Request) {
  if (!(await rateLimit(`create:${clientIp(req)}`, 20, 60 * 60_000))) {
    return NextResponse.json({ error: "You've made a lot of tapes! Try again later." }, { status: 429 });
  }
  const body = await readCassetteBody(req);
  if ("error" in body) return body.error;
  const { cassette, editKey } = await createCassette(body.data);
  return NextResponse.json({ id: cassette.id, editKey, cassette }, { status: 201 });
}
