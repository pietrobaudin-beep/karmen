"use client";

import { useState, useTransition } from "react";
import { createEncounterAction } from "./actions";

export function NewEncounter({
  entities,
  sessionLabel,
  entityLabel,
}: {
  entities: { id: string; name: string }[];
  sessionLabel: string;
  entityLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
      >
        + {sessionLabel}
      </button>
    );
  }

  return (
    <form
      action={(fd) => start(() => createEncounterAction(fd))}
      className="w-full rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-col gap-3">
        <input
          name="title"
          placeholder={`Título do(a) ${sessionLabel.toLowerCase()}`}
          required
          autoFocus
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select
          name="entityId"
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="">{`Sem ${entityLabel.toLowerCase()}`}</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <label className="flex flex-col gap-1 text-xs text-text-dim">
          Data e hora (deixe vazio para agora)
          <input
            name="occurredAt"
            type="datetime-local"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Criando…" : "Criar"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}
