import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export interface SensitiveEntry {
  _id?: string;
  clientId: string;
  conversationId: string;
  messageIndex: number;
  role: string;
  content: string;
  flaggedAt: number;
  note?: string;
}

// GET /api/admin/sensitive -> list flagged/sensitive messages
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const db = await getDb();
    const docs = await db
      .collection<SensitiveEntry>("sensitive")
      .find({})
      .sort({ flaggedAt: -1 })
      .limit(200)
      .toArray();
    return NextResponse.json({ sensitive: docs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}

// POST /api/admin/sensitive -> add a sensitive message entry
// body: { clientId, conversationId, messageIndex, role, content, note? }
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { clientId, conversationId, messageIndex, role, content, note } = body || {};
  if (!clientId || !conversationId || content == null) {
    return NextResponse.json(
      { error: "clientId, conversationId and content are required" },
      { status: 400 }
    );
  }
  try {
    const db = await getDb();
    const entry: SensitiveEntry = {
      clientId,
      conversationId,
      messageIndex: typeof messageIndex === "number" ? messageIndex : -1,
      role: role || "unknown",
      content: String(content),
      flaggedAt: Date.now(),
      note: note ? String(note) : undefined,
    };
    const r = await db.collection<SensitiveEntry>("sensitive").insertOne(entry as any);
    return NextResponse.json({ ok: true, id: r.insertedId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}

// DELETE /api/admin/sensitive?id=... -> remove a flagged entry
export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const db = await getDb();
    await db.collection<SensitiveEntry>("sensitive").deleteOne({ _id: id } as any);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
