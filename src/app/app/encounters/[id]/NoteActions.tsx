"use client";

import { useState, useTransition } from "react";
import { editNoteAction, deleteNoteAction } from "../actions";

export function NoteActions({
  encounterId,
  noteId,
  body,
}: {
  encounterId: string;
  noteId: string;
  body: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <form
        action={(fd) =>
          start(async () => {
            const next = String(fd.get("body") ?? "").trim();
            if (next) await editNoteAction(encounterId, noteId, next);
            setEditing(false);
          })
        }
        className="mt-2 flex flex-col gap-2"
      >
        <textarea
          name="body"
          defaultValue={body}
          rows={3}
          className="rounded border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-accent px-3 py-1 text-xs font-medium text-accent-fg hover:opacity-90"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded border border-border px-3 py-1 text-xs hover:bg-surface-2"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 opacity-60 transition group-hover:opacity-100">
      <button onClick={() => setEditing(true)} className="rounded px-1.5 py-0.5 text-xs hover:bg-surface-2">
        Editar
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("Excluir esta nota?")) start(() => deleteNoteAction(encounterId, noteId));
        }}
        className="rounded px-1.5 py-0.5 text-xs text-danger hover:bg-danger/10"
      >
        Excluir
      </button>
    </div>
  );
}
