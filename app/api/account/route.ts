import { NextRequest, NextResponse } from "next/server";
import {
  createAccount,
  getAccountByEmail,
  USER_COOKIE,
  COOKIE_MAX_AGE,
} from "@/lib/auth";

// GET /api/account — return the currently signed-in account (if any)
export async function GET(req: NextRequest) {
  const email = req.cookies.get(USER_COOKIE)?.value;
  if (!email) return NextResponse.json({ account: null }, { status: 200 });
  try {
    const account = await getAccountByEmail(email);
    if (!account)
      return NextResponse.json({ account: null }, { status: 200 });
    return NextResponse.json(
      {
        account: {
          name: account.name,
          email: account.email,
          clientId: account.clientId,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ account: null }, { status: 200 });
  }
}

// POST /api/account — create a new account (signup)
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const clientId =
    (req.headers.get("x-client-id") || "").trim() ||
    (body.clientId || "").trim() ||
    "";
  if (!clientId)
    return NextResponse.json(
      { error: "Missing client identifier." },
      { status: 400 }
    );

  const result = await createAccount({
    name: body.name,
    email: body.email,
    password: body.password,
    clientId,
  });

  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 });

  const res = NextResponse.json(
    {
      ok: true,
      account: {
        name: result.account.name,
        email: result.account.email,
        clientId: result.account.clientId,
      },
    },
    { status: 201 }
  );
  res.cookies.set(USER_COOKIE, result.account.email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
