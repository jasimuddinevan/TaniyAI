import crypto from "crypto";
import { NextRequest } from "next/server";
import { getDb } from "./mongodb";

export const USER_COOKIE = "taniyai_user";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface Account {
  _id?: unknown;
  name: string;
  email: string;
  passwordHash: string;
  clientId: string;
  createdAt: number;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = crypto.scryptSync(password, salt, 64).toString("hex");
  // constant-time compare
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(verify, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
  clientId: string;
}): Promise<{ ok: true; account: Account } | { ok: false; error: string }> {
  const name = (input.name || "").trim();
  const email = (input.email || "").trim().toLowerCase();
  const password = input.password || "";

  if (!name) return { ok: false, error: "Name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Please enter a valid email." };
  if (password.length < 6)
    return { ok: false, error: "Password must be at least 6 characters." };

  const db = await getDb();
  const existing = await db.collection("accounts").findOne({ email });
  if (existing)
    return { ok: false, error: "An account with that email already exists." };

  const account: Account = {
    name,
    email,
    passwordHash: hashPassword(password),
    clientId: input.clientId,
    createdAt: Date.now(),
  };
  const res = await db.collection("accounts").insertOne(account as any);
  account._id = res.insertedId;
  return { ok: true, account };
}

export async function authenticate(email: string, password: string) {
  const db = await getDb();
  const account = await db.collection("accounts").findOne({
    email: (email || "").trim().toLowerCase(),
  });
  if (!account) return null;
  if (!verifyPassword(password, account.passwordHash)) return null;
  return account as Account;
}

export async function getAccountByClientId(clientId: string) {
  const db = await getDb();
  return (await db
    .collection("accounts")
    .findOne({ clientId })) as Account | null;
}

export async function getAccountByEmail(email: string) {
  const db = await getDb();
  return (await db
    .collection("accounts")
    .findOne({ email: (email || "").trim().toLowerCase() })) as Account | null;
}

// Resolve the signed-in account from the session cookie (server-side).
// Returns null when no valid session is present.
export async function getSessionAccount(req: NextRequest): Promise<Account | null> {
  const email = req.cookies.get(USER_COOKIE)?.value;
  if (!email) return null;
  return getAccountByEmail(email);
}

// Register a clientId as belonging to an account. We keep a list of clientIds
// (one per device/browser) so conversations created on any device stay owned
// by the account. This is what closes the IDOR: a request may only touch a
// clientId that is actually linked to the signed-in account.
export async function addClientIdToAccount(
  email: string,
  clientId: string
): Promise<void> {
  if (!email || !clientId) return;
  const db = await getDb();
  await db
    .collection("accounts")
    .updateOne(
      { email: email.trim().toLowerCase() },
      {
        $addToSet: { clientIds: clientId } as any,
        $setOnInsert: { clientId } as any,
      } as any,
      { upsert: true }
    );
}

// Returns true if the given clientId is owned by the signed-in account.
export async function ownsClientId(
  email: string,
  clientId: string
): Promise<boolean> {
  if (!email || !clientId) return false;
  const account = await getAccountByEmail(email);
  if (!account) return false;
  const list: string[] = (account as any).clientIds || [];
  return list.includes(clientId) || (account as any).clientId === clientId;
}
