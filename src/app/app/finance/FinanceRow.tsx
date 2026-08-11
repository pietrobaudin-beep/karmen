"use client";

import { useTransition } from "react";
import { brl } from "@/lib/money";
import { markPaidAction, deleteFinanceAction } from "./actions";

type Entry = {
  id: string;
  type: string;
  description: string;
  amountCents: number;
  category: string | null;
  status: string;
  dueDate: string | Date | null;
  entityName: string | null;
};

export function FinanceRow({ e }: { e: Entry }) {
  const [pending, start] = useTransition();
  const income = e.type === "income";
  const paid = e.status === "paid";
  const overdue = !paid && e.dueDate && new Date(e.dueDate) < new Date();

  return (
    <li className="group flex items-center gap-3 px-4 py-3">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${
          income ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger"
        }`}
        title={income ? "Receita" : "Despesa"}
      >
        {income ? "↑" : "↓"}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{e.description}</div>
        <div className="text-xs text-text-dim">
          {e.category ?? (income ? "Receita" : "Despesa")}
          {e.entityName ? ` · ${e.entityName}` : ""}
          {e.dueDate ? (
            <span className={overdue ? "text-danger" : ""}>
              {" · "}
              {paid ? "" : overdue ? "venceu " : "vence "}
              {new Date(e.dueDate).toLocaleDateString("pt-BR")}
            </span>
          ) : null}
        </div>
      </div>

      <div className={`shrink-0 text-sm font-medium ${income ? "text-ok" : "text-danger"}`}>
        {income ? "+" : "−"}
        {brl(e.amountCents)}
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-60 transition group-hover:opacity-100">
        <button
          disabled={pending}
          onClick={() => start(() => markPaidAction(e.id, !paid))}
          className={`rounded px-2 py-1 text-xs ${
            paid ? "text-text-dim hover:bg-surface-2" : "text-ok hover:bg-ok/10"
          }`}
        >
          {paid ? (income ? "Recebido" : "Pago") : income ? "Receber" : "Pagar"}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Excluir este lançamento?")) start(() => deleteFinanceAction(e.id));
          }}
          className="rounded px-2 py-1 text-xs text-danger hover:bg-danger/10"
        >
          Excluir
        </button>
      </div>
    </li>
  );
}
