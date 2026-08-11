"use client";

import { useState, useTransition } from "react";
import { renameEntityAction, deleteEntityAction } from "../actions";

export function EntityHeader({ id, name, label }: { id: string; name: string; label: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <form
        action={(fd) =>
          start(async () => {
            await renameEntityAction(id, String(fd.get("name") ?? ""));
            setEditing(false);
          })
        }
        className="flex items-center gap-2"
      >
        <input
          name="name"
          defaultValue={name}
          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-lg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-2"
        >
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-semibold">{name}</h1>
      <button
        onClick={() => setEditing(true)}
        className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-surface-2"
      >
        Renomear
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm(`Excluir ${label.toLowerCase()} "${name}"?`)) start(() => deleteEntityAction(id));
        }}
        className="rounded-lg border border-border px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
      >
        Excluir
      </button>
    </div>
  );
}
