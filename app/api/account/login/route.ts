import { NextRequest, NextResponse } from "next/server";
import {
  authenticate,
  USER_COOKIE,
  COOKIE_MAX_AGE,
  addClientIdToAccount,
} from "@/lib/auth";

// POST /api/account/login — authenticate with email + password
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email || "").trim();
  const password = body.password || "";

  if (!email || !password)
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );

  const account = await authenticate(email, password);
  if (!account)
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 }
    );

  // Link this device's clientId to the account (closes the IDOR).
  const loginClientId =
    (req.headers.get("x-client-id") || "").trim() ||
    (body.clientId || "").trim() ||
    "";
  if (loginClientId) {
    await addClientIdToAccount(account.email, loginClientId);
  }

  const res = NextResponse.json(
    {
      ok: true,
      account: {
        name: account.name,
        email: account.email,
        clientId: account.clientId,
      },
    },
    { status: 200 }
  );
  res.cookies.set(USER_COOKIE, account.email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
