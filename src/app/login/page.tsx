"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div>
        <Link href="/" className="text-sm text-text-dim hover:text-text">
          ← KARMEN
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">Entrar</h1>
      </div>

      <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-dim">E-mail</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-text-dim">Senha</span>
          <input
            name="password"
            type="password"
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 outline-none focus:border-accent"
          />
        </label>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-text-dim">
        Não tem conta?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Criar agora
        </Link>
      </p>
    </main>
  );
}
