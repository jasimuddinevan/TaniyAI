import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE } from "@/lib/auth";

// POST /api/account/logout — clear the session cookie
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set(USER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return res;
}
