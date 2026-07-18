import { NextRequest, NextResponse } from "next/server";
import { getDb, StoredConversation } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/conversations?clientId=...&limit=...&skip=...
// Lists all conversations (optionally filtered by clientId) with summary info.
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const clientId = req.nextUrl.searchParams.get("clientId") || undefined;
  const full = req.nextUrl.searchParams.get("full") === "1";
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50,
    200
  );
  const skip = parseInt(req.nextUrl.searchParams.get("skip") || "0", 10) || 0;

  try {
    const db = await getDb();
    const col = db.collection<StoredConversation>("conversations");

    const filter = clientId ? { clientId } : {};
    const docs = await col
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const conversations = docs.map((d) => ({
      clientId: d.clientId,
      id: d.id,
      title: d.title,
      updatedAt: d.updatedAt,
      messageCount: Array.isArray(d.messages) ? d.messages.length : 0,
      ...(full ? { messages: d.messages } : {}),
    }));

    const total = await col.countDocuments(filter);

    return NextResponse.json({ conversations, total });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}

// GET single conversation detail is handled by the public route;
// here we add a detail endpoint for admin with full messages.
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { clientId, id } = body || {};
  if (!clientId || !id) {
    return NextResponse.json({ error: "clientId and id are required" }, { status: 400 });
  }
  try {
    const db = await getDb();
    const doc = await db
      .collection<StoredConversation>("conversations")
      .findOne({ clientId, id });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      conversation: {
        clientId: doc.clientId,
        id: doc.id,
        title: doc.title,
        updatedAt: doc.updatedAt,
        messages: doc.messages,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
