"use client";

import { useState, useTransition } from "react";
import { bookAction } from "./actions";

const SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export function BookingForm({ orgId, sessionLabel }: { orgId: string; sessionLabel: string }) {
  const [done, setDone] = useState<{ name: string; when: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="rounded-xl border border-ok/40 bg-ok/5 p-6 text-center">
        <div className="text-3xl">✓</div>
        <h2 className="mt-2 text-lg font-medium">Pedido de agendamento enviado!</h2>
        <p className="mt-1 text-sm text-text-dim">
          {done.name}, seu {sessionLabel.toLowerCase()} foi solicitado para {done.when}. Você receberá a confirmação
          pelo contato informado.
        </p>
        <button
          onClick={() => {
            setDone(null);
            setError("");
          }}
          className="mt-4 rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2"
        >
          Fazer outro agendamento
        </button>
      </div>
    );
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError("");
          const res = await bookAction(orgId, fd);
          if (res.ok) {
            const date = String(fd.get("date"));
            const time = String(fd.get("time"));
            setDone({
              name: String(fd.get("name")),
              when: `${new Date(`${date}T${time}`).toLocaleDateString("pt-BR")} às ${time}`,
            });
          } else setError(res.error ?? "Falha ao agendar.");
        })
      }
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-dim">Seu nome</span>
        <input
          name="name"
          required
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-dim">WhatsApp ou e-mail</span>
        <input
          name="contact"
          placeholder="(11) 99999-9999"
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-dim">Data</span>
          <input
            name="date"
            type="date"
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-dim">Horário</span>
          <select
            name="time"
            required
            defaultValue=""
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-brand"
          >
            <option value="" disabled>
              Escolha…
            </option>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-dim">Mensagem (opcional)</span>
        <textarea
          name="note"
          rows={2}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Solicitar agendamento"}
      </button>
    </form>
  );
}
