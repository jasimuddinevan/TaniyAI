import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminKey,
  setAdminCookie,
  clearAdminCookie,
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
  if (!verifyAdminKey(key)) {
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
