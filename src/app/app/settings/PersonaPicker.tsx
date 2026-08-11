"use client";

import { useState, useTransition } from "react";
import { PROFESSIONS } from "@/lib/personas";
import { changePersonaAction } from "./actions";

export function PersonaPicker({ current, locked }: { current: string; locked: boolean }) {
  // profissão atual = a disponível cujo personaType bate com o da org
  const currentKey = PROFESSIONS.find((p) => p.personaType === current)?.key ?? "generic";
  const [selectedKey, setSelectedKey] = useState(currentKey);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [adapting, setAdapting] = useState<{ emoji: string; label: string } | null>(null);

  const selected = PROFESSIONS.find((p) => p.key === selectedKey);
  const changed = selectedKey !== currentKey;

  function save() {
    if (!selected?.personaType || !changed || locked) return;
    if (
      !confirm(
        "Atenção: a troca de tipo de conta é ÚNICA e PERMANENTE — você não poderá alterar depois. " +
          "A plataforma se readapta (Pacientes, Clientes, Alunos…) sem apagar seus dados. Continuar?",
      )
    )
      return;
    start(async () => {
      const res = await changePersonaAction(selected.personaType!);
      if (res.ok) {
        // Tela de carregamento de adaptação → recarrega tudo já na nova profissão.
        setAdapting({ emoji: selected.emoji, label: selected.label });
        setTimeout(() => window.location.assign("/app"), 1900);
      } else {
        setMsg(res);
      }
    });
  }

  if (adapting) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <div className="text-5xl">{adapting.emoji}</div>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-brand" />
        <div>
          <div className="text-lg font-medium">Adaptando a plataforma…</div>
          <div className="mt-1 text-sm text-text-dim">
            Preparando tudo para <span className="text-text">{adapting.label}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {locked ? (
        <div className="mb-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-dim">
          🔒 O tipo de conta já foi definido e é <strong className="text-text">permanente</strong> — não pode ser
          alterado.
        </div>
      ) : (
        <p className="mb-3 text-sm text-text-dim">
          Escolha o tipo de empresa. A troca é <strong className="text-text">única e permanente</strong> — a plataforma
          se readapta (Clientes, Reuniões, Financeiro), sem apagar seus dados.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROFESSIONS.map((p) => {
          const available = p.personaType !== null;
          const isCurrent = p.key === currentKey;
          const active = p.key === selectedKey;
          const disabled = !available || locked;
          return (
            <button
              key={p.key}
              type="button"
              disabled={disabled}
              onClick={() => available && !locked && setSelectedKey(p.key)}
              className={`rounded-xl border p-3 text-left transition ${
                active && available
                  ? "border-brand bg-surface-2 ring-1 ring-brand"
                  : "border-border bg-surface"
              } ${disabled ? "cursor-not-allowed opacity-55" : "hover:bg-surface-2"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{p.emoji}</span>
                {isCurrent ? (
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-text-dim">atual</span>
                ) : !available ? (
                  <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[11px] text-brand">Em breve</span>
                ) : null}
              </div>
              <div className="mt-1.5 text-sm font-medium">{p.label}</div>
            </button>
          );
        })}
      </div>

      {!locked && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={pending || !changed || !selected?.personaType}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Aplicando…" : "Definir tipo de conta"}
          </button>
          {msg?.ok && <span className="text-sm text-ok">Tipo de conta definido.</span>}
          {msg?.error && <span className="text-sm text-danger">{msg.error}</span>}
        </div>
      )}
    </div>
  );
}
