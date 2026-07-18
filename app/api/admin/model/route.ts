import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getModelConfig, setModelConfig } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/model -> current public model config
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const cfg = await getModelConfig();
  return NextResponse.json(cfg);
}

// POST /api/admin/model -> { model, auto }
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const model = (body?.model || "").toString().trim();
  if (!model) {
    return NextResponse.json({ error: "Model is required" }, { status: 400 });
  }
  const auto = Boolean(body?.auto);
  try {
    await setModelConfig(model, auto);
    return NextResponse.json({ ok: true, model, auto });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "db error" }, { status: 500 });
  }
}
