"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Message, ChatSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import MessageList from "./MessageList";
import Composer from "./Composer";
import Logo from "./Logo";
import Sidebar from "./Sidebar";

const SETTINGS_KEY = "openrouter_chat_settings";
const CONVERSATIONS_KEY = "openrouter_chat_conversations";
const ACTIVE_KEY = "openrouter_chat_active";
const CLIENT_ID_KEY = "taniyai_client_id";

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function deriveTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const text = Array.isArray(firstUser.content)
    ? firstUser.content.map((p) => p.text || "").join(" ")
    : firstUser.content;
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 32 ? t.slice(0, 32) + "…" : t || "New chat";
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const firstPersist = useRef(true);
  const settingsFirst = useRef(true);
  const convFirst = useRef(true);
  const loadedFromDb = useRef(false);

  // Load from localStorage before paint so saved messages/settings appear
  // immediately on reload (no blank flash). Also establish a stable clientId
  // used to scope conversations in MongoDB.
  useLayoutEffect(() => {
    let cid = localStorage.getItem(CLIENT_ID_KEY);
    if (!cid) {
      cid = newId();
      localStorage.setItem(CLIENT_ID_KEY, cid);
    }
    setClientId(cid);

    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      if (s && typeof s === "object") {
        setSettings((p) => ({ ...p, ...s }));
        if (s.theme) {
          setTheme(s.theme);
          document.documentElement.classList.toggle("dark", s.theme === "dark");
        }
      }
    } catch {}
    try {
      const convs = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || "[]");
      if (Array.isArray(convs) && convs.length) {
        setConversations(convs);
        const active = localStorage.getItem(ACTIVE_KEY) || convs[0].id;
        const found = convs.find((c: Conversation) => c.id === active);
        if (found) {
          setActiveId(found.id);
          setMessages(found.messages);
        }
      }
    } catch {}

    // Pull conversations from MongoDB (cloud backup) and merge with local.
    fetch(`/api/conversations?clientId=${encodeURIComponent(cid)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.conversations) return;
        setConversations((local) => {
          const byId = new Map(local.map((c) => [c.id, c]));
          for (const c of data.conversations) {
            const existing = byId.get(c.id);
            // Prefer the most recently updated version.
            if (!existing || c.updatedAt > existing.updatedAt) {
              byId.set(c.id, c);
            }
          }
          const merged = Array.from(byId.values()).sort(
            (a, b) => b.updatedAt - a.updatedAt
          );
          loadedFromDb.current = true;
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  // Persist conversations to localStorage (skip the first run so we don't overwrite)
  useEffect(() => {
    if (convFirst.current) {
      convFirst.current = false;
      return;
    }
    try {
      const list = conversations.map((c) => ({
        ...c,
        title: c.id === activeId && messages.length ? deriveTitle(messages) : c.title,
        messages: c.id === activeId ? messages : c.messages,
        updatedAt: c.id === activeId ? Date.now() : c.updatedAt,
      }));
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list));
      if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
      // Keep the conversations state in sync so switching away/back keeps messages
      const activeConv = conversations.find((c) => c.id === activeId);
      if (activeConv && activeConv.messages !== messages) {
        setConversations(list);
      }
    } catch {}
  }, [conversations, messages, activeId]);

  // Mirror conversations to MongoDB (cloud backup) whenever they change.
  useEffect(() => {
    if (!clientId || convFirst.current) return;
    const toSync = conversations.map((c) => ({
      clientId,
      id: c.id,
      title: c.title,
      messages: c.messages,
      updatedAt: c.updatedAt,
    }));
    // Upsert each conversation (small N; fire-and-forget).
    for (const doc of toSync) {
      fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      }).catch(() => {});
    }
  }, [conversations, clientId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (settingsFirst.current) {
      settingsFirst.current = false;
      return;
    }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, theme }));
    } catch {}
  }, [settings, theme]);

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, theme }));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {}
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (busy) {
      setQueue((q) => [...q, trimmed]);
      return;
    }
    await runTurn(trimmed);
  }

  async function runTurn(text: string) {
    // Ensure there is an active conversation to attach messages to
    let convId = activeId;
    if (!convId) {
      convId = newId();
      const conv: Conversation = {
        id: convId,
        title: deriveTitle([{ role: "user", content: text }]),
        messages: [],
        updatedAt: Date.now(),
      };
      setConversations((c) => [conv, ...c]);
      setActiveId(convId);
    }
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    setStreaming("");
    await streamFrom(next);
    setBusy(false);
    setStreaming("");
    if (queue.length > 0) {
      const [nextText, ...rest] = queue;
      setQueue(rest);
      await runTurn(nextText);
    }
  }

  async function streamFrom(next: Message[], modelOverride?: string) {

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelOverride ?? settings.model,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          top_p: settings.topP,
          frequency_penalty: settings.frequencyPenalty,
          presence_penalty: settings.presencePenalty,
          stop: settings.stop,
          stream: settings.stream,
          messages: next,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        let msg = `Request failed (${res.status}).`;
        try {
          const parsed = JSON.parse(err);
          if (parsed?.error?.message) msg = parsed.error.message;
        } catch {}
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `⚠️ ${msg}` },
        ]);
        return;
      }

      if (!settings.stream) {
        const json = await res.json();
        setMessages((m) => [
          ...m,
          { role: "assistant", content: json.content || "(empty response)" },
        ]);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content || "";
            if (delta) {
              full += delta;
              setStreaming(full);
            }
          } catch {}
        }
      }

      setMessages((m) => [...m, { role: "assistant", content: full }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Request failed: ${e.message}` },
      ]);
    }
  }

  function clear() {
    setMessages([]);
    setStreaming("");
  }

  function startNewChat() {
    const id = newId();
    const conv: Conversation = {
      id,
      title: "New chat",
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations((c) => [conv, ...c]);
    setActiveId(id);
    setMessages([]);
    setStreaming("");
  }

  function selectConversation(id: string) {
    const found = conversations.find((c) => c.id === id);
    if (!found) return;
    setActiveId(id);
    setMessages(found.messages);
    setStreaming("");
  }

  function deleteConversation(id: string) {
    setConversations((list) => {
      const next = list.filter((c) => c.id !== id);
      if (id === activeId) {
        const first = next[0];
        if (first) {
          setActiveId(first.id);
          setMessages(first.messages);
        } else {
          setActiveId(null);
          setMessages([]);
        }
      }
      return next;
    });
    if (clientId) {
      fetch(`/api/conversations?id=${encodeURIComponent(id)}&clientId=${encodeURIComponent(clientId)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  }

  function exportChat() {
    const text = messages
      .map((m) => {
        const c = Array.isArray(m.content)
          ? m.content.map((p) => p.text || "[image]").join(" ")
          : m.content;
        return `${m.role === "user" ? "You" : "Assistant"}:\n${c}`;
      })
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat-export.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--cream)] text-[var(--ink)] dark:bg-[#14161c] dark:text-slate-100">
      <div className="relative mx-auto flex h-full w-full max-w-[1200px] gap-5 px-3 py-3 sm:px-4 sm:py-4">
        {/* Collapsible sidebar — inline on desktop, drawer overlay on mobile */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-20 bg-black/30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] max-w-[80%] flex-col bg-[var(--cream)] p-3 animate-fade-up dark:bg-[#14161c] md:static md:w-[240px] md:max-w-none md:bg-transparent md:p-0 md:shrink-0">
              <Sidebar
                theme={theme}
                onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                onSave={saveSettings}
                saved={saved}
                onExport={exportChat}
                onClear={clear}
                onNewChat={startNewChat}
                conversations={conversations}
                activeId={activeId}
                onSelectConversation={selectConversation}
                onDeleteConversation={deleteConversation}
              />
            </aside>
          </>
        )}

        <main className="flex min-w-0 flex-1 flex-col rounded-2xl border border-black/5 bg-[var(--card)]/70 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 border-b border-black/5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 dark:border-white/10">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-transparent bg-transparent text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
              title={sidebarOpen ? "Hide settings" : "Show settings"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-transparent bg-transparent px-1 py-1 shadow-none sm:px-4 sm:py-3 dark:border-transparent dark:bg-transparent">
              <Logo size={32} className="shrink-0 sm:size-[36px]" />
              <div className="leading-none">
                <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">TaniyAI</h1>
              </div>
            </div>
            <button
              onClick={startNewChat}
              className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-[var(--ink)] shadow-sm transition hover:bg-[var(--cream-2)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:px-3"
              title="Start a new chat"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">New chat</span>
            </button>
          </div>
          <MessageList messages={messages} streaming={streaming} />
          {queue.length > 0 && (
            <div className="px-4 pb-1 text-[11px] text-[var(--muted)]">
              {queue.length} message{queue.length > 1 ? "s" : ""} queued…
            </div>
          )}
          <Composer onSend={send} disabled={busy} />
        </main>
      </div>
    </div>
  );
}
