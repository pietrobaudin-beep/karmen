"use client";

import { useState, useTransition } from "react";
import { CalendarView, type CalItem } from "./CalendarView";
import { createAgendaItemAction } from "./actions";

type Entity = { id: string; name: string };

export function AgendaBoard({
  items,
  entities,
  entityLabel,
  sessionLabel,
}: {
  items: CalItem[];
  entities: Entity[];
  entityLabel: string;
  sessionLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"task" | "encounter">("task");
  const [date, setDate] = useState("");
  const [pending, start] = useTransition();

  function openForm(preset?: string) {
    setDate(preset ?? "");
    setOpen(true);
  }

  function submit(fd: FormData) {
    start(async () => {
      const res = await createAgendaItemAction(fd);
      if (res.ok) setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={() => openForm()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          + Novo
        </button>
      </div>

      {open && (
        <form action={submit} className="rounded-xl border border-brand/30 bg-surface p-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="date" value={date} />

          <div className="mb-3 inline-flex rounded-lg border border-border p-0.5 text-sm">
            {(["task", "encounter"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-md px-3 py-1 transition ${
                  kind === k ? "bg-accent text-accent-fg" : "text-text-dim hover:text-text"
                }`}
              >
                {k === "task" ? "Tarefa" : sessionLabel}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="title"
              placeholder={kind === "task" ? "O que precisa ser feito?" : `Título do(a) ${sessionLabel.toLowerCase()}`}
              required
              autoFocus
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
            />
            <label className="flex flex-col gap-1 text-xs text-text-dim">
              {kind === "task" ? "Prazo" : "Data"}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </label>
            {kind === "task" ? (
              <label className="flex flex-col gap-1 text-xs text-text-dim">
                Prioridade
                <select
                  name="priority"
                  defaultValue="normal"
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                </select>
              </label>
            ) : (
              <label className="flex flex-col gap-1 text-xs text-text-dim">
                {entityLabel}
                <select
                  name="entityId"
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="">{`Sem ${entityLabel.toLowerCase()}`}</option>
                  {entities.map((en) => (
                    <option key={en.id} value={en.id}>
                      {en.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
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
            {kind === "task" && (
              <span className="text-xs text-text-dim">Aparece automaticamente no menu de Tarefas.</span>
            )}
          </div>
        </form>
      )}

      <CalendarView items={items} onDayClick={openForm} />
    </div>
  );
}
