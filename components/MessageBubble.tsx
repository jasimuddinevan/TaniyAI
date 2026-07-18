"use client";

import { useState } from "react";
import type { ContentPart } from "@/lib/types";
import Logo from "./Logo";

export default function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string | ContentPart[];
  streaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const text = Array.isArray(content)
    ? content.map((p) => p.text || "").join("")
    : content;

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const images =
    Array.isArray(content) && role === "user"
      ? content.filter((p) => p.type === "image_url").map((p) => p.image_url!.url)
      : [];

  return (
    <div
      className={`flex animate-fade-up items-start gap-2.5 ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {role === "assistant" && (
          <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-transparent bg-transparent dark:border-transparent dark:bg-transparent">
          <Logo size={28} />
        </div>
      )}
      <div
        className={`group relative max-w-[78%] whitespace-pre-wrap rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
          role === "user"
            ? "rounded-tr-md border-transparent bg-[var(--green)] text-white"
            : "rounded-tl-md border-[var(--line)] bg-[var(--card)] text-[var(--ink)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        }`}
        style={{ borderRadius: "12px" }}
      >
        {text && <div>{text}</div>}
        {images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt="uploaded"
                className="max-h-48 rounded-lg border border-white/20 object-cover"
              />
            ))}
          </div>
        )}
        {streaming && <span className="cursor-blink" />}
        {!streaming && text && (
          <button
            onClick={copy}
            className="absolute -top-2 right-2 hidden rounded-md bg-slate-700 px-1.5 py-0.5 text-[10px] text-white shadow group-hover:block"
          >
            {copied ? "copied" : "copy"}
          </button>
        )}
      </div>
      {role === "user" && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--cream-2)] text-[10px] font-bold text-[var(--muted)] dark:bg-slate-800 dark:text-slate-300">
          You
        </div>
      )}
    </div>
  );
}
