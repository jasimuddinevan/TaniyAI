"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import Logo from "./Logo";

export default function MessageList({
  messages,
  streaming,
}: {
  messages: Message[];
  streaming: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className="scrollbar-thin relative z-10 flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
      {messages.length === 0 && !streaming && (
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-[var(--line)] bg-[var(--card)] p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Logo size={40} />
          </div>
          <p className="text-base font-semibold text-[var(--ink)] dark:text-slate-100">
            Hi, how can I help you today?
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            This is TaniyAI, your AI assistant.
          </p>
        </div>
      )}
      {messages.map((m, i) => (
        <MessageBubble key={i} role={m.role} content={m.content} />
      ))}
      {streaming && (
        <MessageBubble role="assistant" content={streaming} streaming />
      )}
      <div ref={endRef} />
    </div>
  );
}
