import { NextResponse } from "next/server";
import { getModelConfig } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Service-status probe. We actually PING the admin-configured model with a
// tiny request so the indicator reflects the real selected model — not just
// whether the API key is valid. (The old version only hit /v1/models, which
// returns 200 for any valid key even if the chosen model is down/paid-out.)
//
// Results are cached briefly server-side so the 30s client polls don't each
// hit OpenRouter.

let cache: { at: number; payload: any } | null = null;
const CACHE_TTL = 15_000; // 15s

async function probeModel(model: string, apiKey: string) {
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
    if (res.ok) return { ok: true, ms };
    const errText = await res.text();
    let reason = `OpenRouter error ${res.status}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) reason = parsed.error.message;
    } catch {}
    // 402/429 => out of credits; 401 => key rejected.
    return { ok: false, ms, reason };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - started, reason: e?.message || "Cannot reach OpenRouter" };
  }
}

export async function GET(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const cfg = await getModelConfig();

  if (!apiKey) {
    return NextResponse.json({
      status: "down",
      reason: "Server missing OPENROUTER_API_KEY",
      model: cfg.model,
      auto: cfg.auto,
    });
  }

  // ?fresh=1 bypasses the cache (used right after the admin changes the model).
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";

  // Serve cached result if fresh.
  if (!fresh && cache && Date.now() - cache.at < CACHE_TTL) {
    return NextResponse.json(cache.payload);
  }

  const probe = await probeModel(cfg.model, apiKey);
  const payload = probe.ok
    ? { status: "operational", model: cfg.model, auto: cfg.auto, ms: probe.ms }
    : {
        status: "down",
        reason: probe.reason,
        model: cfg.model,
        auto: cfg.auto,
        ms: probe.ms,
      };

  cache = { at: Date.now(), payload };
  return NextResponse.json(payload);
}
