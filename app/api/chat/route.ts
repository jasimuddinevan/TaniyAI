import { NextRequest, NextResponse } from "next/server";
import { isBanned } from "@/lib/moderation";

export const dynamic = "force-dynamic";

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

  const stop = (body.stop || "").trim();
  const body2: any = {
    model: body.model || "tencent/hy3:free",
    stream: body.stream !== false,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens ?? 1024,
    top_p: body.top_p ?? 1,
    frequency_penalty: body.frequency_penalty ?? 0,
    presence_penalty: body.presence_penalty ?? 0,
    messages: payloadMessages,
  };
  if (stop) body2.stop = stop.split(",").map((s: string) => s.trim()).filter(Boolean);

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "https://openrouter-chat.vercel.app",
      "X-Title": "TaniyAI",
    },
    body: JSON.stringify(body2),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(`Error ${upstream.status}: ${text}`, {
      status: upstream.status,
    });
  }

  if (body2.stream) {
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
