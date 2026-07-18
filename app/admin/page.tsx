"use client";

import { useEffect, useState, useCallback } from "react";

type Stats = {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalSensitive: number;
};

type UserRow = {
  clientId: string;
  conversations: number;
  messages: number;
  lastActive: number;
};

type ConvRow = {
  clientId: string;
  id: string;
  title: string;
  updatedAt: number;
  messageCount: number;
};

type Message = {
  role: string;
  content: string;
  [k: string]: any;
};

type ConvDetail = {
  clientId: string;
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
};

type SensitiveRow = {
  _id: string;
  clientId: string;
  conversationId: string;
  messageIndex: number;
  role: string;
  content: string;
  flaggedAt: number;
  note?: string;
};

type Tab = "users" | "conversations" | "sensitive";

function fmtDate(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [key, setKey] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [tab, setTab] = useState<Tab>("users");

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [sensitive, setSensitive] = useState<SensitiveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetail, setUserDetail] = useState<{
    clientId: string;
    conversations: ConvDetail[];
  } | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    // Try a protected call to determine auth state.
    const r = await fetch("/api/admin/stats", { cache: "no-store" });
    setAuthed(r.status !== 401);
    return r.status !== 401;
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async () => {
    setLoginErr("");
    const r = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (r.ok) {
      setAuthed(true);
    } else {
      setLoginErr("Invalid admin key");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const [s, u, c, sen] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/conversations?limit=100", { cache: "no-store" }).then((r) =>
          r.json()
        ),
        fetch("/api/admin/sensitive", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setStats(s);
      setUsers(u.users || []);
      setConvs(c.conversations || []);
      setSensitive(sen.sensitive || []);
    } catch (e: any) {
      setMsg("Failed to load: " + (e.message || "error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadAll();
  }, [authed, loadAll]);

  const del = async (mode: string, extra: Record<string, string> = {}) => {
    if (
      !confirm(
        mode === "all"
          ? "DELETE ALL DATA? This cannot be undone."
          : "Confirm delete?"
      )
    )
      return;
    const qs = new URLSearchParams({ mode, ...extra }).toString();
    const r = await fetch("/api/admin/delete?" + qs, { method: "DELETE" });
    const j = await r.json();
    if (r.ok) {
      setMsg("Deleted " + (j.deleted ?? "ok"));
      loadAll();
    } else {
      setMsg("Error: " + (j.error || "delete failed"));
    }
  };

  const removeSensitive = async (id: string) => {
    const r = await fetch("/api/admin/sensitive?id=" + id, { method: "DELETE" });
    if (r.ok) loadAll();
  };

  const viewConversation = async (clientId: string, id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const r = await fetch("/api/admin/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, id }),
      });
      const j = await r.json();
      if (r.ok && j.conversation) {
        setDetail(j.conversation);
      } else {
        setMsg("Error: " + (j.error || "could not load conversation"));
      }
    } catch (e: any) {
      setMsg("Failed to load conversation: " + (e.message || "error"));
    } finally {
      setDetailLoading(false);
    }
  };

  const viewUser = async (clientId: string) => {
    setUserLoading(true);
    setUserDetail(null);
    try {
      const r = await fetch(
        "/api/admin/conversations?clientId=" + encodeURIComponent(clientId) + "&full=1&limit=200",
        { cache: "no-store" }
      );
      const j = await r.json();
      if (r.ok) {
        setUserDetail({ clientId, conversations: j.conversations || [] });
      } else {
        setMsg("Error: " + (j.error || "could not load user"));
      }
    } catch (e: any) {
      setMsg("Failed to load user: " + (e.message || "error"));
    } finally {
      setUserLoading(false);
    }
  };

  if (authed === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">Loading…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--line)] rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-1">TaniyAI Admin</h1>
          <p className="text-sm text-[var(--muted)] mb-4">Enter admin key to continue.</p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Admin key"
            className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--cream)] outline-none focus:border-[var(--accent)]"
          />
          {loginErr && <p className="text-red-600 text-sm mt-2">{loginErr}</p>}
          <button
            onClick={login}
            className="mt-4 w-full py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90"
          >
            Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">TaniyAI Admin</h1>
            <p className="text-sm text-[var(--muted)]">Moderation & data dashboard</p>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg border border-[var(--line)] text-sm hover:bg-[var(--cream-2)]"
          >
            Logout
          </button>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Users" value={stats?.totalUsers} />
          <Stat label="Conversations" value={stats?.totalConversations} />
          <Stat label="Messages" value={stats?.totalMessages} />
          <Stat label="Sensitive" value={stats?.totalSensitive} />
        </section>

        {msg && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-[var(--green-soft)] text-[var(--green)] text-sm">
            {msg}
          </div>
        )}

        {/* Tabs */}
        <nav className="flex gap-1 mb-4 border-b border-[var(--line)]">
          {(["users", "conversations", "sensitive"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${
                tab === t
                  ? "border-[var(--accent)] text-[var(--ink)]"
                  : "border-transparent text-[var(--muted)]"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {loading && <p className="text-[var(--muted)] text-sm">Loading…</p>}

        {tab === "users" && (
          <div className="overflow-x-auto bg-[var(--card)] border border-[var(--line)] rounded-xl">
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)] border-b border-[var(--line)]">
                <tr>
                  <th className="p-3">Client ID</th>
                  <th className="p-3">Conversations</th>
                  <th className="p-3">Messages</th>
                  <th className="p-3">Last active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.clientId} className="border-b border-[var(--line)] last:border-0">
                    <td className="p-3 font-mono text-xs">{u.clientId}</td>
                    <td className="p-3">{u.conversations}</td>
                    <td className="p-3">{u.messages}</td>
                    <td className="p-3">{fmtDate(u.lastActive)}</td>
                    <td className="p-3 flex gap-3">
                      <button
                        onClick={() => viewUser(u.clientId)}
                        className="text-[var(--accent)] hover:underline text-xs"
                      >
                        View
                      </button>
                      <button
                        onClick={() => del("user", { clientId: u.clientId })}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[var(--muted)]">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "conversations" && (
          <div className="overflow-x-auto bg-[var(--card)] border border-[var(--line)] rounded-xl">
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)] border-b border-[var(--line)]">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Msgs</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {convs.map((c) => (
                  <tr key={c.clientId + c.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="p-3 max-w-[220px] truncate">{c.title}</td>
                    <td className="p-3 font-mono text-xs">{c.clientId.slice(0, 8)}…</td>
                    <td className="p-3">{c.messageCount}</td>
                    <td className="p-3">{fmtDate(c.updatedAt)}</td>
                    <td className="p-3 flex gap-3">
                      <button
                        onClick={() => viewConversation(c.clientId, c.id)}
                        className="text-[var(--accent)] hover:underline text-xs"
                      >
                        View
                      </button>
                      <button
                        onClick={() => del("conversation", { id: c.id, clientId: c.clientId })}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {convs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[var(--muted)]">
                      No conversations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "sensitive" && (
          <div className="space-y-3">
            {sensitive.map((s) => (
              <div
                key={s._id}
                className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-[var(--muted)] font-mono">
                    {s.clientId.slice(0, 8)}… / conv {s.conversationId.slice(0, 8)}… / idx{" "}
                    {s.messageIndex} / {s.role}
                  </div>
                  <button
                    onClick={() => removeSensitive(s._id)}
                    className="text-red-600 hover:underline text-xs shrink-0"
                  >
                    Remove flag
                  </button>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap break-words">{s.content}</p>
                {s.note && (
                  <p className="mt-2 text-xs text-[var(--muted)]">Note: {s.note}</p>
                )}
                <p className="mt-1 text-xs text-[var(--muted)]">{fmtDate(s.flaggedAt)}</p>
              </div>
            ))}
            {sensitive.length === 0 && (
              <p className="text-[var(--muted)] text-sm">No sensitive messages flagged.</p>
            )}
          </div>
        )}

        {/* Conversation detail modal */}
        {detail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setDetail(null)}
          >
            <div
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--line)] rounded-2xl p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-semibold">{detail.title}</h3>
                  <p className="text-xs text-[var(--muted)] font-mono">
                    {detail.clientId} / {detail.id}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{fmtDate(detail.updatedAt)}</p>
                </div>
                <button
                  onClick={() => setDetail(null)}
                  className="px-2 py-1 rounded-lg border border-[var(--line)] text-sm hover:bg-[var(--cream-2)]"
                >
                  Close
                </button>
              </div>
              <div className="space-y-3">
                {detail.messages.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[var(--line)] p-3"
                  >
                    <div className="text-xs font-medium capitalize text-[var(--accent)] mb-1">
                      {m.role}
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {typeof m.content === "string"
                        ? m.content
                        : JSON.stringify(m.content)}
                    </p>
                  </div>
                ))}
                {detail.messages.length === 0 && (
                  <p className="text-[var(--muted)] text-sm">No messages in this conversation.</p>
                )}
              </div>
            </div>
          </div>
        )}
        {detailLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl px-6 py-4 text-sm">
              Loading conversation…
            </div>
          </div>
        )}

        {/* User detail modal: all conversations + messages for a user */}
        {userDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setUserDetail(null)}
          >
            <div
              className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--line)] rounded-2xl p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-semibold">User conversations</h3>
                  <p className="text-xs text-[var(--muted)] font-mono">
                    {userDetail.clientId}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {userDetail.conversations.length} conversation(s)
                  </p>
                </div>
                <button
                  onClick={() => setUserDetail(null)}
                  className="px-2 py-1 rounded-lg border border-[var(--line)] text-sm hover:bg-[var(--cream-2)]"
                >
                  Close
                </button>
              </div>
              <div className="space-y-5">
                {userDetail.conversations.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-[var(--line)] p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{c.title}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {fmtDate(c.updatedAt)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {c.messages.map((m, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-[var(--cream)] border border-[var(--line)] p-2"
                        >
                          <div className="text-xs font-medium capitalize text-[var(--accent)] mb-0.5">
                            {m.role}
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {typeof m.content === "string"
                              ? m.content
                              : JSON.stringify(m.content)}
                          </p>
                        </div>
                      ))}
                      {c.messages.length === 0 && (
                        <p className="text-[var(--muted)] text-xs">No messages.</p>
                      )}
                    </div>
                  </div>
                ))}
                {userDetail.conversations.length === 0 && (
                  <p className="text-[var(--muted)] text-sm">No conversations for this user.</p>
                )}
              </div>
            </div>
          </div>
        )}
        {userLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl px-6 py-4 text-sm">
              Loading user…
            </div>
          </div>
        )}

        {/* Danger zone */}
        <section className="mt-8 bg-[var(--card)] border border-red-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-red-700 mb-2">Danger zone</h2>
          <p className="text-xs text-[var(--muted)] mb-3">
            Permanently delete data. This cannot be undone.
          </p>
          <button
            onClick={() => del("all")}
            className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            Delete ALL data
          </button>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
      <div className="text-2xl font-semibold">{value ?? "—"}</div>
      <div className="text-xs text-[var(--muted)] mt-1">{label}</div>
    </div>
  );
}
