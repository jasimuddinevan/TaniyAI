"use client";

import { useState } from "react";

export interface AccountInfo {
  name: string;
  email: string;
  clientId: string;
}

interface Props {
  open: boolean;
  mode: "login" | "signup";
  clientId: string;
  onClose: () => void;
  onSignedIn: (account: AccountInfo) => void;
  onSwitchMode: (mode: "login" | "signup") => void;
}

export default function AuthModal({
  open,
  mode,
  clientId,
  onClose,
  onSignedIn,
  onSwitchMode,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const url = mode === "signup" ? "/api/account" : "/api/account/login";
      const payload =
        mode === "signup"
          ? { name, email, password, clientId }
          : { email, password };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      onSignedIn(data.account);
      setName("");
      setEmail("");
      setPassword("");
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {mode === "signup"
            ? "Save your chats to your account — it's quick."
            : "Sign in to access your saved chats."}
        </p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--cream)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-800"
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--cream)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-800"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--cream)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-800"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signup"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => onSwitchMode("login")}
                className="font-semibold text-[var(--accent)] hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button
                onClick={() => onSwitchMode("signup")}
                className="font-semibold text-[var(--accent)] hover:underline"
              >
                Create an account
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
