"use client";

interface Conversation {
  id: string;
  title: string;
  messages: any[];
  updatedAt: number;
}

export default function Sidebar({
  theme,
  onToggleTheme,
  onSave,
  saved,
  onExport,
  onClear,
  onNewChat,
  conversations,
  activeId,
  onSelectConversation,
  onDeleteConversation,
  status,
  statusReason,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onSave: () => void;
  saved: boolean;
  onExport: () => void;
  onClear: () => void;
  onNewChat: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  status: "operational" | "down" | "checking";
  statusReason?: string;
}) {
  const statusDot =
    status === "operational"
      ? "bg-[var(--green)]"
      : status === "down"
      ? "bg-rose-500"
      : "bg-amber-400";
  const statusText =
    status === "operational"
      ? "Service operational"
      : status === "down"
      ? "Service down"
      : "Checking…";
  const statusColor =
    status === "operational"
      ? "text-[var(--green)]"
      : status === "down"
      ? "text-rose-500"
      : "text-amber-500";

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Live status + model */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3.5 w-3.5">
              {status === "operational" && (
                <span className="absolute inline-flex h-full w-full status-ping rounded-full bg-[var(--green)]" />
              )}
              <span
                className={`relative inline-flex h-3.5 w-3.5 rounded-full ${statusDot}`}
              />
            </span>
            <span className={`text-[12px] font-semibold ${statusColor}`}>
              {statusText}
            </span>
          </div>
        </div>
        {status === "down" && statusReason && (
          <p className="mt-1.5 text-[11px] leading-snug text-rose-500">
            {statusReason}
          </p>
        )}
      </div>

      {/* Chat history */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            History
          </h3>
          <button
            onClick={onNewChat}
            className="rounded-md border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-[11px] text-[var(--ink)] shadow-sm transition hover:bg-[var(--cream-2)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            title="New chat"
          >
            + New
          </button>
        </div>
        <div className="scrollbar-thin -mr-1 flex-1 space-y-1 overflow-y-auto pr-1">
          {conversations.length === 0 && (
            <p className="px-1 py-2 text-[11px] text-[var(--muted)]">
              No chats yet.
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] transition ${
                c.id === activeId
                  ? "bg-[var(--cream-2)] text-[var(--ink)] dark:bg-slate-800 dark:text-slate-100"
                  : "text-[var(--muted)] hover:bg-[var(--cream-2)] dark:hover:bg-slate-800"
              }`}
              style={{ borderRadius: "10px" }}
            >
              <button
                onClick={() => onSelectConversation(c.id)}
                className="flex-1 truncate text-left"
                title={c.title}
              >
                {c.title}
              </button>
              <button
                onClick={() => onDeleteConversation(c.id)}
                className="hidden shrink-0 rounded px-1 text-rose-400 hover:text-rose-600 group-hover:block"
                title="Delete chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onSave}
          className="mt-3 w-full rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          {saved ? "✓ Saved" : "💾 Save preferences"}
        </button>

        <div className="mt-2 flex gap-2">
          <button
            onClick={onToggleTheme}
            className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-[var(--ink)] shadow-sm transition hover:bg-[var(--cream-2)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            title="Toggle theme"
          >
            {theme === "dark" ? "🌓 Dark" : "☀️ Light"}
          </button>
          <button
            onClick={onExport}
            className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-[var(--ink)] shadow-sm transition hover:bg-[var(--cream-2)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            title="Export chat"
          >
            ⬇ Export
          </button>
        </div>
        <button
          onClick={onClear}
          className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-[var(--ink)] shadow-sm transition hover:border-rose-300 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          title="Clear chat"
        >
          🗑 Clear chat
        </button>
      </div>
    </div>
  );
}
