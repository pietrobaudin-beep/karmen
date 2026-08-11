"use client";

import { useTransition } from "react";
import { summarizeAction } from "../actions";

export function SummarizeButton({ encounterId, enabled }: { encounterId: string; enabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => start(() => summarizeAction(encounterId))}
        disabled={pending || !enabled}
        title={enabled ? "" : "Defina ANTHROPIC_API_KEY para ativar"}
        className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/20 disabled:opacity-50"
      >
        {pending ? "✦ Resumindo…" : "✦ Resumir + gerar tarefas"}
      </button>
      {!enabled && <span className="text-xs text-text-dim">IA off (sem API key)</span>}
    </div>
  );
}
