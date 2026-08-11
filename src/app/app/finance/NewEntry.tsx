"use client";

import { useRef, useState, useTransition } from "react";
import { createFinanceAction } from "./actions";

export function NewEntry() {
  const [type, setType] = useState<"income" | "expense">("income");
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          await createFinanceAction(fd);
          formRef.current?.reset();
          setType("income");
        })
      }
      className="rounded-xl border border-border bg-surface p-4"
    >
      <div className="mb-3 inline-flex rounded-lg border border-border p-0.5 text-sm">
        {(["income", "expense"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-md px-3 py-1 transition ${
              type === t ? "bg-accent text-accent-fg" : "text-text-dim hover:text-text"
            }`}
          >
            {t === "income" ? "Receita" : "Despesa"}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="description"
          placeholder="Descrição"
          required
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
        />
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="Valor (R$)"
          required
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          name="category"
          placeholder="Categoria (opcional)"
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <label className="flex flex-col gap-1 text-xs text-text-dim">
          Vencimento
          <input
            name="dueDate"
            type="date"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-dim">
          Situação
          <select
            name="status"
            defaultValue="pending"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          >
            <option value="pending">{type === "income" ? "A receber" : "A pagar"}</option>
            <option value="paid">{type === "income" ? "Recebido" : "Pago"}</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "+ Lançamento"}
      </button>
    </form>
  );
}
