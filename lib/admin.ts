import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_COOKIE = "taniyai_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function getAdminKey(): string {
  return process.env.ADMIN_KEY || "";
}

// Verify a provided key against the configured ADMIN_KEY.
export function verifyAdminKey(key: string): boolean {
  const expected = getAdminKey();
  if (!expected) return false;
  // constant-time-ish compare
  if (key.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= key.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

// Set the admin session cookie.
export function setAdminCookie(res: NextResponse, key: string) {
  res.cookies.set(ADMIN_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

// Returns true if the current request is authenticated as admin.
export function isAdminRequest(req?: NextRequest): boolean {
  const key = req
    ? req.cookies.get(ADMIN_COOKIE)?.value
    : cookies().get(ADMIN_COOKIE)?.value;
  if (!key) return false;
  return verifyAdminKey(key);
}

// Helper for admin API routes: returns a 401 response if not authenticated.
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
