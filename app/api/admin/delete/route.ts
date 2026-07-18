import { NextRequest, NextResponse } from "next/server";
import { getDb, StoredConversation } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// DELETE /api/admin/delete
// Modes:
//  - ?mode=conversation&id=...&clientId=...  -> delete one conversation
//  - ?mode=user&clientId=...                  -> delete all conversations for a user
//  - ?mode=all                                -> delete ALL conversations (and sensitive)
export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const mode = req.nextUrl.searchParams.get("mode");
  const id = req.nextUrl.searchParams.get("id");
  const clientId = req.nextUrl.searchParams.get("clientId");

  try {
    const db = await getDb();
    const col = db.collection<StoredConversation>("conversations");

    if (mode === "conversation") {
      if (!id || !clientId) {
        return NextResponse.json(
          { error: "id and clientId are required for conversation delete" },
          { status: 400 }
        );
      }
      const r = await col.deleteOne({ clientId, id });
      return NextResponse.json({ ok: true, deleted: r.deletedCount });
    }

    if (mode === "user") {
      if (!clientId) {
        return NextResponse.json(
          { error: "clientId is required for user delete" },
          { status: 400 }
        );
      }
      const r = await col.deleteMany({ clientId });
      // also remove sensitive entries for this user
      await db.collection("sensitive").deleteMany({ clientId } as any);
      return NextResponse.json({ ok: true, deleted: r.deletedCount });
    }

    if (mode === "all") {
      const r = await col.deleteMany({});
      await db.collection("sensitive").deleteMany({});
      return NextResponse.json({ ok: true, deleted: r.deletedCount });
    }

    return NextResponse.json(
      { error: "Invalid mode. Use conversation, user, or all." },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
