import { NextRequest, NextResponse } from "next/server";
import { getDb, StoredConversation } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// DELETE /api/admin/message?clientId=...&id=...&index=...
// Removes a single message from a stored conversation by its index.
export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const clientId = req.nextUrl.searchParams.get("clientId") || "";
  const id = req.nextUrl.searchParams.get("id") || "";
  const indexRaw = req.nextUrl.searchParams.get("index");
  const index = indexRaw === null ? -1 : parseInt(indexRaw, 10);

  if (!clientId || !id || Number.isNaN(index) || index < 0) {
    return NextResponse.json(
      { error: "clientId, id and a valid index are required" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const col = db.collection<StoredConversation>("conversations");
    const conv = await col.findOne({ clientId, id });
    if (!conv) {
      return NextResponse.json({ error: "conversation not found" }, { status: 404 });
    }
    const msgs = Array.isArray(conv.messages) ? conv.messages : [];
    if (index >= msgs.length) {
      return NextResponse.json({ error: "message index out of range" }, { status: 400 });
    }
    msgs.splice(index, 1);
    await col.updateOne({ clientId, id }, { $set: { messages: msgs } } as any);
    return NextResponse.json({ ok: true, remaining: msgs.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
