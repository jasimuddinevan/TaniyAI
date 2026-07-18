import { NextRequest, NextResponse } from "next/server";
import { getDb, StoredConversation } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/users -> distinct clientIds with conversation counts + last active
export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const db = await getDb();
    const col = db.collection<StoredConversation>("conversations");

    const users = await col
      .aggregate([
        {
          $group: {
            _id: "$clientId",
            conversations: { $sum: 1 },
            lastActive: { $max: "$updatedAt" },
            messages: {
              $sum: { $size: { $ifNull: ["$messages", []] } },
            },
          },
        },
        { $sort: { lastActive: -1 } },
        {
          $project: {
            clientId: "$_id",
            conversations: 1,
            messages: 1,
            lastActive: 1,
            _id: 0,
          },
        },
      ])
      .toArray();

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
