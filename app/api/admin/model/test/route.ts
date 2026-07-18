import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// POST /api/admin/model/test -> { model }  (or uses admin-configured model)
// Sends a tiny request to OpenRouter with the chosen model and reports
// whether it is live / responding.
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Server is missing OPENROUTER_API_KEY." },
      { status: 500 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const model = (body?.model || "").toString().trim();
  if (!model) {
    return NextResponse.json({ ok: false, error: "Model is required." }, { status: 400 });
  }

  const started = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://openrouter-chat.vercel.app",
        "X-Title": "TaniyAI",
      },
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with the single word: ok" }],
      }),
    });

    const ms = Date.now() - started;

    if (res.ok) {
      const data = await res.json().catch(() => null);
      const text = data?.choices?.[0]?.message?.content || "";
      return NextResponse.json({ ok: true, model, ms, reply: text.trim() });
    }

    const errText = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {}
    return NextResponse.json({ ok: false, model, ms, error: message });
  } catch (e: any) {
    const ms = Date.now() - started;
    return NextResponse.json({
      ok: false,
      model,
      ms,
      error: e?.message || "Network error reaching OpenRouter.",
    });
  }
}
