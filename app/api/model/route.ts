import { NextResponse } from "next/server";
import { getModelConfig } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET /api/model -> public model config (no auth). Used by the client to
// know which model is currently served to the public.
export async function GET() {
  const cfg = await getModelConfig();
  return NextResponse.json(cfg);
}
