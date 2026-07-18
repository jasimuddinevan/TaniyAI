"use client";

import { useState } from "react";

export default function Composer({
  onSend,
  disabled,
}: {
  onSend: (t: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");

  function submit() {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <div className="glass relative z-10 flex gap-3 border-t border-[var(--line)] p-4 dark:border-slate-800">
      <div
        className="flex flex-1 flex-col rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-2 shadow-sm focus-within:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-900"
        style={{ borderRadius: "12px" }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="max-h-40 flex-1 resize-none bg-transparent py-1 text-sm text-[var(--ink)] outline-none dark:text-slate-100"
        />
      </div>
      <button
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] px-5 font-semibold text-[var(--ink)] shadow-sm transition hover:bg-[var(--cream-2)] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        style={{ borderRadius: "12px" }}
      >
        <span>Send</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22 11 13 2 9 22 2z" />
        </svg>
      </button>
    </div>
  );
}
