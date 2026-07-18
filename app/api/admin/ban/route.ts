import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { setBanned, listBanned } from "@/lib/moderation";

export const dynamic = "force-dynamic";

// GET /api/admin/ban -> list banned clientIds
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const banned = await listBanned();
    return NextResponse.json({ banned });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}

// POST /api/admin/ban { clientId, reason? } -> ban
// DELETE /api/admin/ban?clientId=... -> unban
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const body = await req.json();
    const clientId = (body.clientId || "").toString().trim();
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }
    await setBanned(clientId, true, (body.reason || "").toString());
    return NextResponse.json({ ok: true, banned: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const clientId = req.nextUrl.searchParams.get("clientId") || "";
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }
    await setBanned(clientId, false);
    return NextResponse.json({ ok: true, banned: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
