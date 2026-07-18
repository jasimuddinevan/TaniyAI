import { NextResponse } from "next/server";
import { getModelConfig } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Lightweight liveness + service-status probe. We check whether the
// OpenRouter API key still has access (credits) by hitting the models
// endpoint. This lets the UI show a live "operational / down" indicator.
export async function GET() {
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

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (res.ok) {
      return NextResponse.json({
        status: "operational",
        model: cfg.model,
        auto: cfg.auto,
      });
    }
    // 401/402/429 => key invalid or out of credits => service effectively down.
    const reason =
      res.status === 402 || res.status === 429
        ? "API credits exhausted"
        : res.status === 401
        ? "API key rejected"
        : `OpenRouter error ${res.status}`;
    return NextResponse.json({
      status: "down",
      reason,
      model: cfg.model,
      auto: cfg.auto,
    });
  } catch {
    return NextResponse.json({
      status: "down",
      reason: "Cannot reach OpenRouter",
      model: cfg.model,
      auto: cfg.auto,
    });
  }
}
