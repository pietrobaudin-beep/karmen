"use client";

import { useRef, useTransition } from "react";

// Formulário inline reutilizável: um input + botão que chama uma server action.
export function InlineCreate({
  action,
  placeholder,
  cta,
  name = "name",
}: {
  action: (formData: FormData) => Promise<void>;
  placeholder: string;
  cta: string;
  name?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          await action(fd);
          formRef.current?.reset();
        })
      }
      className="flex gap-2"
    >
      <input
        name={name}
        placeholder={placeholder}
        required
        className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "…" : cta}
      </button>
    </form>
  );
}
