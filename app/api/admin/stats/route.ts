import { NextRequest, NextResponse } from "next/server";
import { getDb, StoredConversation } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/stats -> aggregate counts
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const db = await getDb();
    const col = db.collection<StoredConversation>("conversations");

    const totalConversations = await col.countDocuments();
    const usersAgg = await col
      .aggregate([{ $group: { _id: "$clientId" } }, { $count: "n" }])
      .toArray();
    const totalUsers = usersAgg[0]?.n || 0;

    // total messages across all conversations
    const msgAgg = await col
      .aggregate([
        { $project: { n: { $size: { $ifNull: ["$messages", []] } } } },
        { $group: { _id: null, total: { $sum: "$n" } } },
      ])
      .toArray();
    const totalMessages = msgAgg[0]?.total || 0;

    const sensitive = await db.collection("sensitive").countDocuments();

    return NextResponse.json({
      totalUsers,
      totalConversations,
      totalMessages,
      totalSensitive: sensitive,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
