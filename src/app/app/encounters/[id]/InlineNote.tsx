"use client";

import { useRef, useTransition } from "react";
import { addNoteAction } from "../actions";

export function InlineNote({ encounterId, noteLabel }: { encounterId: string; noteLabel: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          await addNoteAction(encounterId, fd);
          formRef.current?.reset();
        })
      }
      className="flex flex-col gap-2"
    >
      <textarea
        name="body"
        rows={3}
        placeholder={`Escreva a ${noteLabel.toLowerCase()}… (o que foi conversado, decisões, próximos passos)`}
        required
        className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar anotação"}
      </button>
    </form>
  );
}
