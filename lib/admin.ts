import crypto from "crypto";
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
// Changing the key invalidates all existing admin sessions.
export async function setAdminKey(key: string): Promise<void> {
  const db = await getDb();
  await db
    .collection("config")
    .updateOne({ _id: "adminKey" } as any, { $set: { key } }, { upsert: true });
  cachedKey = key;
  cachedAt = Date.now();
  await resetAdminSessions();
}

// ---- Public model configuration (set by admin) ----

export interface ModelConfig {
  model: string;
  auto: boolean;
}

let cachedModel: ModelConfig | null = null;
let cachedModelAt = 0;

// Read the public model config from the database, falling back to the
// TENIYAI_MODEL env var or the built-in default.
export async function getModelConfig(): Promise<ModelConfig> {
  const now = Date.now();
  if (cachedModel !== null && now - cachedModelAt < CACHE_TTL) return cachedModel;
  const envModel = process.env.TENIYAI_MODEL || "tencent/hy3:free";
  try {
    const db = await getDb();
    const doc = await db
      .collection("config")
      .findOne({ _id: "modelConfig" } as any);
    const cfg: ModelConfig = {
      model: (doc?.model as string) || envModel,
      auto: Boolean(doc?.auto),
    };
    cachedModel = cfg;
    cachedModelAt = now;
    return cfg;
  } catch {
    cachedModel = { model: envModel, auto: false };
    cachedModelAt = now;
    return cachedModel;
  }
}

// Persist the public model config and refresh the cache.
export async function setModelConfig(model: string, auto: boolean): Promise<void> {
  const db = await getDb();
  await db
    .collection("config")
    .updateOne(
      { _id: "modelConfig" } as any,
      { $set: { model, auto } },
      { upsert: true }
    );
  cachedModel = { model, auto };
  cachedModelAt = Date.now();
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

// ---- Admin session tokens (the cookie stores a random token, NOT the key) ----

// Create a new admin session: generate a random token, persist it, and set
// the session cookie. The raw admin key is never stored in the cookie.
export async function createAdminSession(res: NextResponse): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  try {
    const db = await getDb();
    await db
      .collection("adminSessions")
      .insertOne({ token, createdAt: Date.now() } as any);
  } catch {
    // If the DB is unavailable we still set the cookie; auth is best-effort.
  }
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return token;
}

// Clear the admin session cookie (does not touch the DB session row).
export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

// Destroy the admin session both in the DB and the cookie.
export async function destroyAdminSession(
  req: NextRequest,
  res: NextResponse
): Promise<void> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token) {
    try {
      const db = await getDb();
      await db.collection("adminSessions").deleteOne({ token } as any);
    } catch {}
  }
  clearAdminCookie(res);
}

// Invalidate every admin session (e.g. after the admin key is changed).
export async function resetAdminSessions(): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("adminSessions").deleteMany({});
  } catch {}
}

// Returns true if the current request carries a valid admin session token.
export async function isAdminRequest(req?: NextRequest): Promise<boolean> {
  const token = req
    ? req.cookies.get(ADMIN_COOKIE)?.value
    : cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const db = await getDb();
    const doc = await db.collection("adminSessions").findOne({ token } as any);
    if (!doc) return false;
    // Expire sessions older than the cookie lifetime.
    if (Date.now() - (doc.createdAt || 0) > COOKIE_MAX_AGE * 1000) {
      await db.collection("adminSessions").deleteOne({ token } as any);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Helper for admin API routes: returns a 401 response if not authenticated.
export async function requireAdmin(req: NextRequest): Promise<NextResponse | undefined> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return undefined;
}
