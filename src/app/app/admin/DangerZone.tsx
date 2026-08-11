"use client";

import { useState, useTransition } from "react";
import { purgeAction } from "./actions";

const MODULES: { key: string; label: string }[] = [
  { key: "tasks", label: "Tarefas" },
  { key: "finance", label: "Financeiro" },
  { key: "encounters", label: "Encontros" },
  { key: "entities", label: "Contatos/Entidades" },
  { key: "chat", label: "Mensagens do chat" },
];

export function DangerZone({ canPurge }: { canPurge: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>("");

  function purge(key: string, label: string) {
    if (!confirm(`Apagar TODOS os registros de "${label}"? Esta ação não pode ser desfeita.`)) return;
    start(async () => {
      const res = await purgeAction(key);
      setMsg(res.ok ? `"${label}" apagado.` : res.error ?? "Falha.");
    });
  }

  return (
    <div className="rounded-xl border border-danger/40 bg-danger/5 p-5">
      <div className="mb-1 text-sm font-medium text-danger">Zona de perigo</div>
      <p className="mb-3 text-xs text-text-dim">
        Apaga permanentemente todos os registros de um módulo desta organização.
        {!canPurge && " (Somente o dono pode usar.)"}
      </p>
      <div className="flex flex-wrap gap-2">
        {MODULES.map((m) => (
          <button
            key={m.key}
            disabled={!canPurge || pending}
            onClick={() => purge(m.key, m.label)}
            className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-40"
          >
            Apagar {m.label}
          </button>
        ))}
      </div>
      {msg && <p className="mt-3 text-sm text-text-dim">{msg}</p>}
    </div>
  );
}
