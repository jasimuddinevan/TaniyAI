import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/models -> live list of free OpenRouter models (up to 10).
// Fetches the OpenRouter /v1/models catalog and returns only *:free models
// so the admin panel always reflects what is actually free right now.
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server missing OPENROUTER_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter error ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    const models: any[] = Array.isArray(data?.data) ? data.data : [];

    const free = models
      .filter((m) => typeof m.id === "string" && m.id.endsWith(":free"))
      // Prefer models with a larger context window (more capable first).
      .sort((a, b) => (b.context_length || 0) - (a.context_length || 0))
      .slice(0, 10)
      .map((m) => ({
        id: m.id,
        name: m.name || m.id,
        context_length: m.context_length || 0,
      }));

    return NextResponse.json({ models: free });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to reach OpenRouter." },
      { status: 502 }
    );
  }
}
