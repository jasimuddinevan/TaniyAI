import { NextRequest, NextResponse } from "next/server";
import { isBanned } from "@/lib/moderation";
import { getModelConfig } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Fallback models used when "auto" mode is enabled and the primary model
// fails (e.g. free-tier credits exhausted -> 402/429). Ordered by preference.
const FALLBACK_MODELS = [
  "tencent/hy3:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen3-coder:free",
  "openai/gpt-oss-20b:free",
];

// Static system message injected by the backend (users cannot override it).
const STATIC_SYSTEM_PROMPT =
  "You are TaniyAI, a helpful, friendly, kiddy and concise assistant. expert in Bengali, provide resposne in Bengali language by defoult. " +
  "Provide accurate answers, ask clarifying questions when needed, and keep responses clear and well-structured. " +
  "You are a large language model trained by TaniyAI. " +
  "Respond in a concise and clear manner, and avoid unnecessary repetition. " +
  "If the user asks for code, provide only the code without additional commentary." + 
  "resposne friendly, learn from user response, and add user's name in the response if user provide it, and if user ask for a story, provide a story in Bengali language with a moral lesson at the end. "
  

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing the OPENROUTER_API_KEY environment variable." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = body.messages ?? [];

  // Enforce ban by clientId (sent from the client on each request).
  const clientId = (body.clientId || "").toString().trim();
  if (clientId && (await isBanned(clientId))) {
    return NextResponse.json(
      {
        error:
          "This account has been banned by a moderator. Please contact support if you think this is a mistake.",
      },
      { status: 403 }
    );
  }

  const payloadMessages = [{ role: "system", content: STATIC_SYSTEM_PROMPT }, ...messages];

  // Determine which model to use. The admin-configured public model wins;
  // the client may still override it. When "auto" mode is on, we also try
  // fallback models if the primary fails.
  const cfg = await getModelConfig();
  const requested = body.model || cfg.model;
  const auto = cfg.auto && !body.model; // explicit client model disables auto
  const modelQueue = auto
    ? [requested, ...FALLBACK_MODELS.filter((m) => m !== requested)]
    : [requested];

  const stop = (body.stop || "").trim();

  let upstream: Response | null = null;
  let lastError = "";
  for (const model of modelQueue) {
    const body2: any = {
      model,
      stream: body.stream !== false,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1024,
      top_p: body.top_p ?? 1,
      frequency_penalty: body.frequency_penalty ?? 0,
      presence_penalty: body.presence_penalty ?? 0,
      messages: payloadMessages,
    };
    if (stop) body2.stop = stop.split(",").map((s: string) => s.trim()).filter(Boolean);

    let res: Response;
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "https://openrouter-chat.vercel.app",
          "X-Title": "TaniyAI",
        },
        body: JSON.stringify(body2),
      });
    } catch (e: any) {
      // Network-level failure -> treat as a failed model, retry next if auto.
      lastError = `Network error on ${model}: ${e?.message || e}`;
      if (auto) continue;
      break;
    }

    // A 200 with a JSON error payload (non-streaming) means the model failed.
    // In streaming mode we trust res.ok (errors arrive as SSE data lines).
    if (res.ok) {
      if (body.stream !== false) {
        upstream = res;
        break;
      }
      const txt = await res.text();
      let errored = false;
      try {
        const parsed = JSON.parse(txt);
        if (parsed?.error) errored = true;
      } catch {
        // not JSON -> treat as a successful non-stream JSON response
      }
      if (errored) {
        lastError = `Error on ${model}: ${txt}`;
        if (auto) continue;
        break;
      }
      upstream = new Response(txt, { status: res.status, headers: res.headers });
      break;
    }

    lastError = `Error ${res.status} on ${model}: ${await res.text()}`;
    // Retry on quota/rate-limit (402/429) or any 5xx when auto mode is on.
    if (!auto) break;
    if (res.status !== 402 && res.status !== 429 && res.status < 500) break;
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response(lastError || "All models failed.", {
      status: 502,
    });
  }

  if (body.stream !== false) {
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const data = await upstream.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content || "";
  return NextResponse.json({ content: text });
}
