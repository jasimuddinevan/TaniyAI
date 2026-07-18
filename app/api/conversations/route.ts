import { NextRequest, NextResponse } from "next/server";
import { getDb, StoredConversation } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// GET /api/conversations?clientId=...  -> list conversations for a client
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }
  try {
    const db = await getDb();
    const docs = await db
      .collection<StoredConversation>("conversations")
      .find({ clientId })
      .sort({ updatedAt: -1 })
      .toArray();
    const list = docs.map((d) => ({
      id: d.id,
      title: d.title,
      messages: d.messages,
      updatedAt: d.updatedAt,
    }));
    return NextResponse.json({ conversations: list });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}

// POST /api/conversations  -> upsert one conversation
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { clientId, id, title, messages, updatedAt } = body || {};
  if (!clientId || !id) {
    return NextResponse.json({ error: "clientId and id are required" }, { status: 400 });
  }
  try {
    const db = await getDb();
    const doc: StoredConversation = {
      clientId,
      id,
      title: title || "New chat",
      messages: Array.isArray(messages) ? messages : [],
      updatedAt: updatedAt || Date.now(),
    };
    await db
      .collection<StoredConversation>("conversations")
      .updateOne(
        { clientId, id },
        { $set: doc },
        { upsert: true }
      );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}

// DELETE /api/conversations?id=...&clientId=...  -> delete one conversation
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!id || !clientId) {
    return NextResponse.json({ error: "id and clientId are required" }, { status: 400 });
  }
  try {
    const db = await getDb();
    await db
      .collection<StoredConversation>("conversations")
      .deleteOne({ clientId, id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
