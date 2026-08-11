"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { PERSONA_LIST } from "@/lib/personas";
import { signupAction, type SignupState } from "./actions";

export default function SignupPage() {
  const [persona, setPersona] = useState<string>("");
  const [state, formAction, pending] = useActionState<SignupState, FormData>(signupAction, {});

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-8 px-6 py-12">
      <div>
        <Link href="/" className="text-sm text-text-dim hover:text-text">
          ← KARMEN
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">Vamos configurar sua conta</h1>
        <p className="mt-1 text-text-dim">Primeiro: que tipo de empresa é a sua? A plataforma se adapta a isso.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PERSONA_LIST.map((p) => {
          const active = persona === p.type;
          return (
            <button
              key={p.type}
              type="button"
              onClick={() => setPersona(p.type)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? "border-accent bg-surface-2 ring-1 ring-accent"
                  : "border-border bg-surface hover:bg-surface-2"
              }`}
            >
              <div className="text-2xl">{p.emoji}</div>
              <div className="mt-2 font-medium">{p.displayName}</div>
              <div className="mt-0.5 text-sm text-text-dim">{p.tagline}</div>
            </button>
          );
        })}
      </div>

      {persona && (
        <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
          <input type="hidden" name="personaType" value={persona} />
          <Field name="orgName" label="Nome da organização" placeholder="Ex: Consultório Dra. Ana" />
          <Field name="name" label="Seu nome" placeholder="Como te chamam" />
          <Field name="email" label="E-mail" type="email" placeholder="voce@exemplo.com" />
          <Field name="password" label="Senha" type="password" placeholder="Mínimo 6 caracteres" />

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Criando…" : "Criar conta"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-text-dim">
        Já tem conta?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-text-dim">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required
        className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-text outline-none transition focus:border-accent"
      />
    </label>
  );
}
