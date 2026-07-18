"use client";

import type { ChatSettings } from "@/lib/types";
import { MODELS } from "@/lib/types";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[var(--muted)]">{label}</span>
        {hint && (
          <span className="tabular-nums text-[var(--ink)] dark:text-slate-100">
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function ConfigPanel({
  settings,
  onChange,
  theme,
  onToggleTheme,
  onClear,
  onExport,
  onSave,
  saved,
}: {
  settings: ChatSettings;
  onChange: (p: Partial<ChatSettings>) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onClear: () => void;
  onExport: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  const active = MODELS.find((m) => m.id === settings.model);

  return (
    <div className="flex flex-col gap-5 text-xs">
      <Section title="Model">
        <select
          value={settings.model}
          onChange={(e) => onChange({ model: e.target.value })}
          className={inputCls}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.free ? " · free" : ""}
            </option>
          ))}
        </select>
        {active && (
          <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
            {active.description}
            <br />
            Context: {active.context.toLocaleString()} tokens
          </p>
        )}
      </Section>

      <Section title="Parameters">
        <Field label="Temperature" hint={settings.temperature.toFixed(1)}>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={settings.temperature}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </Field>
        <Field label="Top P" hint={settings.topP.toFixed(2)}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.topP}
            onChange={(e) => onChange({ topP: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </Field>
        <Field label="Max tokens" hint={String(settings.maxTokens)}>
          <input
            type="number"
            min={1}
            max={8192}
            value={settings.maxTokens}
            onChange={(e) =>
              onChange({ maxTokens: parseInt(e.target.value) || 1024 })
            }
            className={inputCls}
          />
        </Field>
        <Field
          label="Frequency penalty"
          hint={settings.frequencyPenalty.toFixed(1)}
        >
          <input
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={settings.frequencyPenalty}
            onChange={(e) =>
              onChange({ frequencyPenalty: parseFloat(e.target.value) })
            }
            className="w-full accent-[var(--accent)]"
          />
        </Field>
        <Field
          label="Presence penalty"
          hint={settings.presencePenalty.toFixed(1)}
        >
          <input
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={settings.presencePenalty}
            onChange={(e) =>
              onChange({ presencePenalty: parseFloat(e.target.value) })
            }
            className="w-full accent-[var(--accent)]"
          />
        </Field>
        <Field label="Stop sequences" hint="comma-separated">
          <input
            type="text"
            value={settings.stop}
            placeholder="e.g. END, ###"
            onChange={(e) => onChange({ stop: e.target.value })}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Options">
        <label className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <span className="text-[var(--ink)] dark:text-slate-100">
            Stream response
          </span>
          <input
            type="checkbox"
            checked={settings.stream}
            onChange={(e) => onChange({ stream: e.target.checked })}
            className="h-4 w-4 accent-[var(--accent)]"
          />
        </label>
      </Section>

      <Section title="Actions">
        <button
          onClick={onSave}
          className="w-full rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          title="Save preferences"
        >
          {saved ? "✓ Saved" : "💾 Save preferences"}
        </button>
        <div className="flex gap-2">
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
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-[var(--ink)] shadow-sm transition hover:border-rose-300 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          title="Clear chat"
        >
          🗑 Clear chat
        </button>
      </Section>
    </div>
  );
}
