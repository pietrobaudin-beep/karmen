"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveTaskAction, editTaskAction, deleteTaskAction } from "./actions";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | Date | null;
  entityName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
};
type Member = { id: string; name: string };

const COLUMNS: { key: string; label: string }[] = [
  { key: "open", label: "A fazer" },
  { key: "doing", label: "Em andamento" },
  { key: "done", label: "Concluído" },
];

export function Kanban({ tasks, members }: { tasks: Task[]; members: Member[] }) {
  type OptAction = { type: "move"; id: string; status: string } | { type: "delete"; id: string };
  const [optimistic, apply] = useOptimistic(tasks, (state: Task[], a: OptAction) =>
    a.type === "delete"
      ? state.filter((t) => t.id !== a.id)
      : state.map((t) => (t.id === a.id ? { ...t, status: a.status } : t)),
  );
  const [, startTransition] = useTransition();
  const [overCol, setOverCol] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  function move(id: string, status: string) {
    startTransition(() => {
      apply({ type: "move", id, status });
      moveTaskAction(id, status);
    });
  }

  function remove(id: string) {
    startTransition(() => {
      apply({ type: "delete", id });
      deleteTaskAction(id);
    });
  }

  function handleDrop(status: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      setOverCol(null);
      const id = e.dataTransfer.getData("text/plain") || dragId;
      setDragId(null);
      if (id) move(id, status);
    };
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = optimistic.filter((t) => t.status === col.key);
        const isOver = overCol === col.key;
        return (
          <div key={col.key} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-medium">{col.label}</h2>
              <span className="rounded-full bg-surface-2 px-2 text-xs text-text-dim">{items.length}</span>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (overCol !== col.key) setOverCol(col.key);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
              }}
              onDrop={handleDrop(col.key)}
              className={`flex min-h-[140px] flex-col gap-2 rounded-xl border p-2 transition ${
                isOver ? "border-brand bg-brand/5" : "border-border bg-surface-2/40"
              }`}
            >
              {items.length === 0 ? (
                <p className="py-6 text-center text-xs text-text-dim">
                  {isOver ? "Solte aqui" : "Arraste um card aqui"}
                </p>
              ) : (
                items.map((t) => (
                  <Card
                    key={t.id}
                    task={t}
                    members={members}
                    onMove={move}
                    onDelete={remove}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", t.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(t.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    dragging={dragId === t.id}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function toDateInput(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function Card({
  task,
  members,
  onMove,
  onDelete,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  task: Task;
  members: Member[];
  onMove: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const suppressClick = useRef(false);
  const overdue = task.status !== "done" && task.dueDate && new Date(task.dueDate) < new Date();
  const idx = COLUMNS.findIndex((c) => c.key === task.status);

  function openDetail() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    router.push(`/app/tasks/${task.id}`);
  }

  if (editing) {
    return (
      <form
        action={(fd) =>
          start(async () => {
            await editTaskAction(task.id, {
              title: String(fd.get("title") ?? "").trim() || task.title,
              priority: String(fd.get("priority") ?? "normal"),
              dueDate: (String(fd.get("dueDate") ?? "") || null) as string | null,
              assigneeId: String(fd.get("assigneeId") ?? ""),
            });
            setEditing(false);
          })
        }
        className="flex flex-col gap-2 rounded-lg border border-brand/40 bg-surface p-2.5"
      >
        <input
          name="title"
          defaultValue={task.title}
          className="rounded border border-border bg-surface-2 px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            name="priority"
            defaultValue={task.priority}
            className="rounded border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-accent"
          >
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
          </select>
          <input
            name="dueDate"
            type="date"
            defaultValue={toDateInput(task.dueDate)}
            className="rounded border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
        </div>
        <select
          name="assigneeId"
          defaultValue={task.assigneeId ?? ""}
          className="rounded border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-accent"
        >
          <option value="">Sem responsável</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
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
    <div
      draggable
      onClick={openDetail}
      onDragStart={(e) => {
        suppressClick.current = false;
        onDragStart(e);
      }}
      onDragEnd={() => {
        suppressClick.current = true;
        onDragEnd();
      }}
      className={`group cursor-pointer rounded-lg border border-border bg-surface p-2.5 transition hover:border-brand/50 active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="text-sm">{task.title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-dim">
        {task.entityName && <span className="rounded bg-surface-2 px-1.5 py-0.5">{task.entityName}</span>}
        {task.assigneeName && <span className="rounded bg-surface-2 px-1.5 py-0.5">@{task.assigneeName}</span>}
        {task.priority === "high" && (
          <span className="rounded bg-danger/15 px-1.5 py-0.5 text-danger">alta</span>
        )}
        {task.dueDate && (
          <span className={overdue ? "text-danger" : ""}>
            {overdue ? "atrasada " : "vence "}
            {new Date(task.dueDate).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1 opacity-60 transition group-hover:opacity-100">
        <button
          disabled={idx <= 0 || pending}
          onClick={(e) => {
            e.stopPropagation();
            onMove(task.id, COLUMNS[idx - 1].key);
          }}
          title="Voltar coluna"
          className="rounded px-1.5 py-0.5 text-xs hover:bg-surface-2 disabled:opacity-30"
        >
          ◀
        </button>
        <button
          disabled={idx >= COLUMNS.length - 1 || pending}
          onClick={(e) => {
            e.stopPropagation();
            onMove(task.id, COLUMNS[idx + 1].key);
          }}
          title="Avançar coluna"
          className="rounded px-1.5 py-0.5 text-xs hover:bg-surface-2 disabled:opacity-30"
        >
          ▶
        </button>
        <span className="flex-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          className="rounded px-1.5 py-0.5 text-xs hover:bg-surface-2"
        >
          Editar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Excluir esta tarefa?")) onDelete(task.id);
          }}
          className="rounded px-1.5 py-0.5 text-xs text-danger hover:bg-danger/10"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}
