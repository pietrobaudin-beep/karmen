"use client";

import { useState, useTransition } from "react";
import { editTaskAction, moveTaskAction, deleteTaskAndRedirectAction } from "../actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  createdAt: string;
};
type Member = { id: string; name: string };

const STATUS = [
  { key: "open", label: "A fazer" },
  { key: "doing", label: "Em andamento" },
  { key: "done", label: "Concluído" },
];

function toDateInput(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function TaskDetail({ task, members }: { task: Task; members: Member[] }) {
  const [status, setStatus] = useState(task.status);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function changeStatus(next: string) {
    setStatus(next);
    start(() => moveTaskAction(task.id, next));
  }

  function save(fd: FormData) {
    start(async () => {
      await editTaskAction(task.id, {
        title: String(fd.get("title") ?? "").trim() || task.title,
        description: (String(fd.get("description") ?? "").trim() || null) as string | null,
        priority: String(fd.get("priority") ?? "normal"),
        dueDate: (String(fd.get("dueDate") ?? "") || null) as string | null,
        assigneeId: String(fd.get("assigneeId") ?? ""),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <form action={save} className="rounded-xl border border-border bg-surface p-5">
      <input
        name="title"
        defaultValue={task.title}
        className="w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-xl font-semibold outline-none focus:border-border focus:bg-surface-2 focus:px-2"
      />

      {/* Status segmentado */}
      <div className="mt-3 inline-flex rounded-lg border border-border p-0.5 text-sm">
        {STATUS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => changeStatus(s.key)}
            className={`rounded-md px-3 py-1 transition ${
              status === s.key ? "bg-accent text-accent-fg" : "text-text-dim hover:text-text"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="text-sm text-text-dim">Descrição</span>
        <textarea
          name="description"
          defaultValue={task.description ?? ""}
          rows={4}
          placeholder="Detalhe a tarefa: contexto, critérios de pronto, links…"
          className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-dim">Prioridade</span>
          <select
            name="priority"
            defaultValue={task.priority}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-dim">Prazo</span>
          <input
            name="dueDate"
            type="date"
            defaultValue={toDateInput(task.dueDate)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-dim">Responsável</span>
          <select
            name="assigneeId"
            defaultValue={task.assigneeId ?? ""}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Sem responsável</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {saved && <span className="text-sm text-ok">Salvo.</span>}
        <span className="flex-1" />
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Excluir esta tarefa?")) start(() => deleteTaskAndRedirectAction(task.id));
          }}
          className="rounded-lg border border-border px-3 py-2 text-sm text-danger hover:bg-danger/10"
        >
          Excluir
        </button>
      </div>
    </form>
  );
}
