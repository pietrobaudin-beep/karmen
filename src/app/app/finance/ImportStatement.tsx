"use client";

import { useState, useTransition } from "react";
import { analyzeStatementAction, bulkCreateFinanceAction } from "./actions";
import type { ParsedEntry } from "@/lib/ai";

export function ImportStatement({ enabled, claudeOn }: { enabled: boolean; claudeOn: boolean }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ParsedEntry[] | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [pending, start] = useTransition();

  function analyze(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg("Karmen lendo o extrato…");
    setEntries(null);
    const fd = new FormData();
    fd.append("statement", file);
    start(async () => {
      const res = await analyzeStatementAction(fd);
      if (res.ok && res.entries) {
        setEntries(res.entries);
        setMsg(res.entries.length ? "" : "Nenhum lançamento detectado.");
      } else {
        setMsg(res.error ?? "Falha ao ler.");
      }
    });
  }

  function confirm() {
    if (!entries?.length) return;
    start(async () => {
      const { created } = await bulkCreateFinanceAction(entries);
      setMsg(`${created} lançamento(s) importado(s).`);
      setEntries(null);
      setOpen(false);
    });
  }

  function remove(i: number) {
    setEntries((prev) => prev?.filter((_, idx) => idx !== i) ?? null);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2"
      >
        ✦ Importar extrato
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-brand">✦ Importar extrato com a Karmen</span>
        <button onClick={() => setOpen(false)} className="text-xs text-text-dim hover:text-text">
          fechar
        </button>
      </div>
      <p className="mb-3 text-xs text-text-dim">
        Suba um <strong>CSV</strong> do extrato — a Karmen extrai os lançamentos, classifica e você confirma.
        {claudeOn
          ? " PDF e foto também funcionam (IA ativa)."
          : " PDF/foto exigem a IA (ANTHROPIC_API_KEY); CSV funciona offline."}
      </p>

      {!entries && (
        <label
          className={`inline-block cursor-pointer rounded-lg px-3 py-2 text-sm ${
            enabled ? "bg-brand text-brand-fg hover:opacity-90" : "cursor-not-allowed bg-surface-2 text-text-dim"
          }`}
        >
          {pending ? "Lendo…" : "Escolher arquivo"}
          <input
            type="file"
            accept={claudeOn ? ".csv,.txt,.ofx,application/pdf,image/*" : ".csv,.txt,.ofx"}
            onChange={analyze}
            disabled={!enabled || pending}
            className="hidden"
          />
        </label>
      )}

      {entries && entries.length > 0 && (
        <div className="mt-2">
          <div className="mb-2 text-xs text-text-dim">
            {entries.length} lançamento(s) detectado(s) — revise e confirme:
          </div>
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface">
            {entries.map((e, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className={e.type === "income" ? "text-ok" : "text-danger"}>
                  {e.type === "income" ? "↑" : "↓"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{e.description}</div>
                  <div className="text-xs text-text-dim">
                    {e.category ?? "—"}
                    {e.date ? ` · ${e.date}` : ""}
                  </div>
                </div>
                <span className={`shrink-0 ${e.type === "income" ? "text-ok" : "text-danger"}`}>
                  {e.type === "income" ? "+" : "−"}R$ {e.amountReais.toFixed(2)}
                </span>
                <button onClick={() => remove(i)} className="shrink-0 text-xs text-text-dim hover:text-danger">
                  remover
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={confirm}
            disabled={pending}
            className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Importando…" : `Importar ${entries.length} lançamento(s)`}
          </button>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-text-dim">{msg}</p>}
    </div>
  );
}
