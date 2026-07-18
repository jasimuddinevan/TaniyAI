import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "./mongodb";

export const ADMIN_COOKIE = "taniyai_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// In-memory cache of the admin key (refreshed from DB/env periodically).
let cachedKey: string | null = null;
let cachedAt = 0;
const CACHE_TTL = 30_000; // 30s

// Read the admin key from the database (persisted), falling back to the
// ADMIN_KEY environment variable. The DB value wins once it has been set.
export async function getAdminKey(): Promise<string> {
  const now = Date.now();
  if (cachedKey !== null && now - cachedAt < CACHE_TTL) return cachedKey;
  const envKey = process.env.ADMIN_KEY || "";
  try {
    const db = await getDb();
    const doc = await db
      .collection("config")
      .findOne({ _id: "adminKey" } as any);
    const key = (doc?.key as string) || envKey;
    cachedKey = key;
    cachedAt = now;
    return key;
  } catch {
    cachedKey = envKey;
    cachedAt = now;
    return envKey;
  }
}

// Persist a new admin key to the database and refresh the cache.
export async function setAdminKey(key: string): Promise<void> {
  const db = await getDb();
  await db
    .collection("config")
    .updateOne({ _id: "adminKey" } as any, { $set: { key } }, { upsert: true });
  cachedKey = key;
  cachedAt = Date.now();
}

// Verify a provided key against the configured ADMIN_KEY.
export async function verifyAdminKey(key: string): Promise<boolean> {
  const expected = await getAdminKey();
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
export async function isAdminRequest(req?: NextRequest): Promise<boolean> {
  const key = req
    ? req.cookies.get(ADMIN_COOKIE)?.value
    : cookies().get(ADMIN_COOKIE)?.value;
  if (!key) return false;
  return verifyAdminKey(key);
}

// Helper for admin API routes: returns a 401 response if not authenticated.
export async function requireAdmin(req: NextRequest): Promise<NextResponse | undefined> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return undefined;
}
