import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminKey,
  setAdminCookie,
  clearAdminCookie,
  setAdminKey,
  requireAdmin,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

// POST /api/admin/auth  -> login with { key }
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const key = body?.key || "";
  if (!(await verifyAdminKey(key))) {
    return NextResponse.json({ error: "Invalid admin key" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  setAdminCookie(res, key);
  return res;
}

// DELETE /api/admin/auth  -> logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}

// PATCH /api/admin/auth  -> change admin key (no current password required)
// body: { newKey }
export async function PATCH(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const newKey = (body?.newKey || "").toString();
  if (newKey.length < 4) {
    return NextResponse.json(
      { error: "New key must be at least 4 characters" },
      { status: 400 }
    );
  }
  try {
    await setAdminKey(newKey);
    const res = NextResponse.json({ ok: true });
    setAdminCookie(res, newKey);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
