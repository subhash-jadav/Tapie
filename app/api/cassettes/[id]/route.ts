import { NextResponse } from "next/server";
import { canEdit, deleteCassette, getCassette, updateCassette } from "@/lib/store";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { readCassetteBody } from "../body";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const cassette = await getCassette(id);
  if (!cassette) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const key = req.headers.get("x-edit-key");
  return NextResponse.json({ cassette, canEdit: key ? await canEdit(id, key) : false });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!rateLimit(`update:${clientIp(req)}`, 120, 10 * 60_000)) {
    return NextResponse.json({ error: "Saving too often. Wait a moment." }, { status: 429 });
  }
  const key = req.headers.get("x-edit-key") ?? "";
  const body = await readCassetteBody(req);
  if ("error" in body) return body.error;
  const result = await updateCassette(id, key, body.data);
  if (result.status === "notfound") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.status === "forbidden") return NextResponse.json({ error: "This edit link isn't valid." }, { status: 403 });
  return NextResponse.json({ cassette: result.cassette });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const result = await deleteCassette(id, req.headers.get("x-edit-key") ?? "");
  if (result === "notfound") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "This edit link isn't valid." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
