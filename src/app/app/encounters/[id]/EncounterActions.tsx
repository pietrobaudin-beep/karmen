"use client";

import { useState, useTransition } from "react";
import { editEncounterAction, deleteEncounterAction } from "../actions";

function toLocalInput(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function EncounterActions({
  id,
  title,
  occurredAt,
}: {
  id: string;
  title: string;
  occurredAt: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <form
        action={(fd) =>
          start(async () => {
            await editEncounterAction(id, {
              title: String(fd.get("title") ?? "").trim() || title,
              occurredAt: String(fd.get("occurredAt") ?? "") || null,
            });
            setEditing(false);
          })
        }
        className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
      >
        <input
          name="title"
          defaultValue={title}
          className="rounded border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <input
          name="occurredAt"
          type="datetime-local"
          defaultValue={toLocalInput(occurredAt)}
          className="rounded border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded border border-border px-3 py-1.5 text-xs hover:bg-surface-2"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setEditing(true)}
        className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-2"
      >
        Editar
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("Excluir este encontro e suas notas?")) start(() => deleteEncounterAction(id));
        }}
        className="rounded-lg border border-border px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
      >
        Excluir
      </button>
    </div>
  );
}
