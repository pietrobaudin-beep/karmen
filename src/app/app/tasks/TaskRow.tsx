"use client";

import { useTransition } from "react";
import { toggleTaskAction } from "./actions";

export function TaskRow({
  id,
  title,
  status,
  priority,
  dueDate,
  entityName,
}: {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  entityName: string | null;
}) {
  const [pending, start] = useTransition();
  const done = status === "done";
  const overdue = !done && dueDate && new Date(dueDate) < new Date();

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={done}
        disabled={pending}
        onChange={(e) => start(() => toggleTaskAction(id, e.target.checked))}
        className="h-4 w-4 shrink-0 accent-[var(--accent)]"
      />
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${done ? "text-text-dim line-through" : ""}`}>{title}</div>
        <div className="text-xs text-text-dim">
          {entityName ?? "Geral"}
          {dueDate ? (
            <span className={overdue ? "text-danger" : ""}>
              {" · "}
              {overdue ? "atrasada — " : "vence "}
              {new Date(dueDate).toLocaleDateString("pt-BR")}
            </span>
          ) : null}
        </div>
      </div>
      {priority === "high" && !done && (
        <span className="rounded bg-danger/15 px-1.5 py-0.5 text-xs text-danger">alta</span>
      )}
    </li>
  );
}
