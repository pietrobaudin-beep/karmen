"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteMemberAction, type InviteState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteMemberAction, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          placeholder="Nome"
          required
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          name="email"
          type="email"
          placeholder="E-mail"
          required
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          name="password"
          type="text"
          placeholder="Senha inicial (compartilhe)"
          required
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select
          name="role"
          defaultValue="member"
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="member">Membro</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p className="text-sm text-ok">Membro adicionado.</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Adicionando…" : "+ Adicionar membro"}
      </button>
    </form>
  );
}
