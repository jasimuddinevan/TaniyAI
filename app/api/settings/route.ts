import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// GET /api/settings?clientId=...  -> load saved settings for a client
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }
  try {
    const db = await getDb();
    const doc = await db
      .collection("settings")
      .findOne({ clientId });
    return NextResponse.json({ settings: doc?.data || null });
  } catch {
    return NextResponse.json({ settings: null });
  }
}

// POST /api/settings  -> upsert settings for a client
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { clientId, data } = body || {};
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }
  try {
    const db = await getDb();
    await db
      .collection("settings")
      .updateOne(
        { clientId },
        { $set: { clientId, data: data || {}, updatedAt: Date.now() } },
        { upsert: true }
      );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
